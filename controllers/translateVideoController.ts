import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import multer from "multer";
import dotenv from "dotenv";
import Translate from "../models/Translate";
dotenv.config();

// Configure API client
export const heygenApi = axios.create({
  baseURL: "https://api.heygen.com",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": process.env.HEY_GEN_KEY!,
  },
});

// Ensure the temp directory exists
const tempDir = path.resolve("temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer configuration for file upload
export const upload = multer({
  storage: multer.memoryStorage(), // Store in memory
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
});

// Controller function for translating videos
export const translateVideo = async (req: Request, res: Response) => {
  const { video_url, output_language } = req.body;

  try {
    let filePath;
    let translatingData: any = {
      output_language,
      callback_id: "test123",
      translate_audio_only: false,
    };

    // If a file is uploaded, save it to the temp directory
    if (req.file) {
      console.log("File received:", req.file.originalname);
      const tempFileName = req.file.originalname;
      filePath = path.join(tempDir, tempFileName);
      fs.writeFileSync(filePath, req.file.buffer);
      translatingData.video_url = `${process.env.API_URL}/api/video/translate-video/file/${req.file.originalname}`;
      translatingData.title = `${tempFileName} - ${output_language}`;
    }

    // If video_url is provided, use it
    if (video_url) {
      translatingData.video_url = video_url;
    }

    // Call the translation API
    const response = await heygenApi.post(
      "/v2/video_translate",
      translatingData
    );

    // Store translation info in the database
    await Translate.create({
      user: req.user.id,
      video_translate_id: response.data.data.video_translate_id,
      temp: req.file ? req.file.originalname : undefined,
    });

    res
      .status(200)
      .json({ message: "Translation started", data: response.data });
  } catch (error: any) {
    console.error(
      "Error in translation:",
      error.message || error.response?.data
    );
    res.status(500).json({
      error: "Failed to start translation",
      details: error.message || error.response?.data,
    });
  }
};

export const getTranslatedVideo = async (req: Request, res: Response) => {
  try {
    const translates = await Translate.find({ user: req.user.id });
    res.json({ translates });
  } catch (error) {
    console.error("Error fetching user videos:", error);
    res.status(500).json({ error: "Error fetching user videos" });
  }
};

// Serve translated files
export const serveTranslatedFile = (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(tempDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
};
