import { Request, Response } from "express";
import dotenv from "dotenv";
import axios from "axios";
import Video from "../models/Video";

dotenv.config();

const heyGenKey = process.env.HEY_GEN_KEY;

const heygenApi = axios.create({
  baseURL: "https://api.heygen.com",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": heyGenKey,
  },
});

export const generateFileUrl = async (req: Request, res: Response) => {
  if (req.file) {
    console.log(req.file);
    const fileUrl = `${process.env.API_URL}/api/video/translate-video/file/${req.file.filename}`;
    res.json({ url: fileUrl });
  } else {
    res.status(500).json({ error: "Error generate fileUrl" });
  }
};

export const createVideo = async (req: Request, res: Response) => {
  console.log(req.body);
  const { character, voice, background, name } = req.body;

  const creatingData = {
    title: name || `Video_${Date.now()}`, // You can customize this as needed
    video_inputs: [
      {
        character: character,
        voice: voice,
        background: undefined, // Initialize the optional property
      },
    ],
    callback_id: "test123",
  };

  if (background) {
    creatingData.video_inputs[0].background = background;
  }

  try {
    const response = await heygenApi.post("/v2/video/generate", creatingData);
    const video = new Video({
      user: req.user.id,
      video_id: (response.data as { data: { video_id: string } }).data.video_id,
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

export const deleteVideo = async (req: Request, res: Response) => {
  try {
    console.log(`Deleting Video ID: ${req.params.videoId}`);

    // Find the video by ID
    const user_video = await Video.findOne({ video_id: req.params.videoId });

    if (!user_video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const video_id = user_video.video_id; // Retrieve video_id from DB

    console.log("Found Video:", user_video);

    // First, delete the video from the external API
    try {
      const deleteResponse = await heygenApi.delete(
        `/v1/video.delete?video_id=${video_id}`
      );
      console.log("External API Delete Response:", deleteResponse.data);
    } catch (apiError) {
      console.error("Error deleting video from Heygen API:", apiError);
      return res
        .status(500)
        .json({ error: "Failed to delete video from external service" });
    }

    // Then, delete the video from the database
    await Video.findOneAndDelete({ video_id: req.params.videoId });

    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
