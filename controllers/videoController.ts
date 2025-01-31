import { Request, Response } from "express";
import dotenv from "dotenv";
import axios from "axios";
import Video from "../models/Video";

dotenv.config();

const heyGenKey = process.env.HEY_GEN_KEY;


const heygenApi = axios.create({
    baseURL: "https://api.heygen.com",
    headers: {
      'Content-Type': 'application/json',
      "X-Api-Key":heyGenKey},
  });


export const createVideo = async (req: Request, res: Response) => {
  console.log(req.body);
  const { character , voice, background,  name } = req.body;  
  
  const creatingData = {
    title: name || `Video_${Date.now()}`, // You can customize this as needed
    video_inputs: [
      {
        character: character,
        voice: voice,
        background: undefined // Initialize the optional property
      }
    ],
    callback_id:"test123"    
  };

  if(background){
    creatingData.video_inputs[0].background = background;
  }

  try {
    const response = await heygenApi.post("/v2/video/generate", creatingData);
    const video = new Video({
      user: req.user.id,
      video_id:response.data.data.video_id
    });
    await video.save();
    res.json({ resultData: response.data });
  } catch (error) {
    console.error("Error creating video:", error);
    res.status(500).json({ error: "Error creating video" });
  }
};

export const getVideos = async (req: Request, res: Response) => {
  try {
    const videos = await Video.find({ user: req.user.id });
    res.json({ videos });
  } catch (error) {
    console.error("Error fetching user videos:", error);
    res.status(500).json({ error: "Error fetching user videos" });
  }
};

