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
    if (!response.data || !response.data.refId || !response.data.profileKey) {
      return res.status(400).json({ error: "Invalid response from Ayrshare" });
    }

    const { refId, profileKey } = response.data;

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
