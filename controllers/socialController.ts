import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import User from "../models/User";

dotenv.config();

const ayrshareKey = process.env.AYRSHARE_KEY;

const ayrshareApi = axios.create({
  baseURL: "https://api.ayrshare.com",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ayrshareKey}`,
  },
});

const privateKey = fs.readFileSync("id-3oo9l-private-key.key", "utf8");

export const createUserProfile = async (req: Request, res: Response) => {
  const { title } = req.body;

  try {
    // Find the user and ensure it exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Send request to Ayrshare API
    const response = await ayrshareApi.post("/api/profiles", {
      title: title,
      email: user.email, // Use user's email from the database
    });

    // Ensure response contains the required fields
    const ayrshareData = response.data as AyrshareResponse;
    if (!ayrshareData || !ayrshareData.refId || !ayrshareData.profileKey) {
      return res.status(400).json({ error: "Invalid response from Ayrshare" });
    }

    // Define the expected type for Ayrshare API response
    interface AyrshareResponse {
      refId: string;
      profileKey: string;
    }

    // Cast response.data to the defined type
    const { refId, profileKey } = response.data as AyrshareResponse;

    // Update user document with refId and profileKey
    user.ayrshareRefId = refId;
    user.ayrshareProfileKey = profileKey;
    await user.save(); // Save changes to the database

    // Handle successful response
    res.status(200).json({
      message: "profile create successfully",
      data: response.data,
    });
  } catch (error: any) {
    console.error(
      "Error in create profile:",
      error.message || error.response?.data
    );
    res.status(500).json({
      error: "Failed to create user profile",
      details: error.message || error.response?.data,
    });
  }
};

export const socialLinkManage = async (req: Request, res: Response) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  try {
    const response = await ayrshareApi.post("/api/profiles/generateJWT", {
      domain: "id-3oo9l",
      privateKey,
      profileKey: user.ayrshareProfileKey,
    });

    res.status(200).json({ data: response.data });
  } catch (error: any) {
    console.log(error);
    console.error(
      "Error in social link:",
      error.message || error.response?.data
    );
    res.status(500).json({
      error: "Failed to social link",
      details: error.message || error.response?.data,
    });
  }
};

export const postMedia = async (req: Request, res: Response) => {
  const { postData } = req.body;
  console.log(postData);
  try {
    const response = await ayrshareApi.post("/api/post", postData, {
      headers: {
        "Profile-Key": req.user.ayrshareProfileKey,
      },
    });

    res.status(200).json({ data: response.data });
  } catch (error: any) {
    console.log(error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to post media",
      details: error.response?.data || error.message,
    });
  }
};

export const socialAnalytics = async (req: Request, res: Response) => {
  const { socials } = req.body;
  try {
    const response = await ayrshareApi.post(
      "/api/analytics/social",
      {
        platforms: socials,
      },
      {
        headers: {
          "Profile-Key": req.user.ayrshareProfileKey,
        },
      }
    );
    res.status(200).json({ data: response.data });
  } catch (error: any) {
    console.log(error.response?.data || error.message);
    res.status(500).json({
      error: "Failed to social analytics",
      details: error.response?.data || error.message,
    });
  }
};
