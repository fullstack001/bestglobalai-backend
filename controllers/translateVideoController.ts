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

// Ensure the temp directory exists asynchronously
const tempDir = path.resolve("temp");
fs.promises
  .mkdir(tempDir, { recursive: true })
  .catch((err) => console.error("Error creating temp directory:", err));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueFilename);
  },
});

// Multer Middleware for File Upload
export const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit
});

// Controller for Video Translation
export const translateVideo = async (req: Request, res: Response) => {
  const { video_url, output_language } = req.body;

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    let translatingData: any = {
      output_language,
      callback_id: "test123",
      translate_audio_only: false,
    };

    // If a file is uploaded, process it
    if (req.file) {
      console.log("File received:", req.file.originalname);
      translatingData.video_url = `${process.env.API_URL}/api/video/translate-video/file/${req.file.filename}`;
      translatingData.title = `${req.file.originalname} - ${output_language}`;
    } else if (video_url) {
      translatingData.video_url = video_url;
    } else {
      return res.status(400).json({ error: "No video source provided" });
    }

    // Call HeyGen Translation API
    const response = await heygenApi.post(
      "/v2/video_translate",
      translatingData
    );

    // Store translation record in database
    await Translate.create({
      user: req.user.id,
      // Cast response.data to the expected type
      video_translate_id: (
        response.data as { data: { video_translate_id: string } }
      ).data.video_translate_id,
      temp: req.file ? req.file.filename : undefined,
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

// Get Translated Videos for a User
export const getTranslatedVideo = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const translates = await Translate.find({ user: req.user.id });
    res.json({ translates });
  } catch (error) {
    console.error("Error fetching user videos:", error);
    res.status(500).json({ error: "Error fetching user videos" });
  }
};

// Serve Translated Files
export const serveTranslatedFile = (req: Request, res: Response) => {
  const filename = req.params.filename;
  const filePath = path.join(tempDir, filename);
  console.log(filePath);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  } else {
    return res.status(404).json({ error: "File not found" });
  }
};
