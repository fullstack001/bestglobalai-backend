import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const ayrshareKey = process.env.AYRSHARE_KEY;

const ayrshareApi = axios.create({
  baseURL: "https://api.ayrshare.com",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ayrshareKey}`,
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
    const uniqueFilename = file.originalname;
    cb(null, uniqueFilename);
  },
});

// Multer Middleware for File Upload
export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB limit
});

// Controller for Video Translation
export const getMediaUrl = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    if (req.file) {
      const { originalname, mimetype, path: filePath } = req.file;

      // Step 1: Obtain a presigned upload URL
      const { data } = await ayrshareApi.get(
        `/media/uploadUrl?fileName=${originalname}&contentType=${mimetype}`
      );

      // Define the expected type for the response data
      type AyrshareResponse = {
        uploadUrl: string;
        accessUrl: string;
        contentType: string;
      };

      // Cast data to the expected type
      const { uploadUrl, accessUrl, contentType } = data as AyrshareResponse;
      console.log("Upload URL:", uploadUrl, accessUrl, contentType);

      // Step 2: Upload the media file using the presigned URL
      const fileStats = await fs.promises.stat(filePath);
      const fileStream = fs.createReadStream(filePath);

      await axios.put(uploadUrl, fileStream, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": fileStats.size, // Explicitly set Content-Length
        },
      });

      // Step 3: Delete the temporary file after successful upload
      await fs.promises.unlink(filePath);

      res
        .status(200)
        .json({ message: "Media uploaded successfully", accessUrl });
    } else {
      res.status(400).json({ error: "No file uploaded" });
    }
  } catch (error: any) {
    console.error(
      "Error in getting URL:",
      error.message || error.response?.data
    );
    res.status(500).json({
      error: "Failed getting URL",
      details: error.message || error.response?.data,
    });
  }
};
