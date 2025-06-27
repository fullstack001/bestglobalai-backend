import { Request, Response } from "express";
import csvParser from "csv-parser";
import fs from "fs";
import path from "path";
import Follower from "../models/Follower";
import User from "../models/User";
import Mailgun from "mailgun.js";
import formData from "form-data";
import multer from "multer";
import dotenv from "dotenv";
import { sendInvites as sendInvitesTemplate } from "../config/mailTemplate";
dotenv.config();

const frontend_url = process.env.FRONTEND_URL;
interface MulterFile {
  filename: string;
  path: string;
}

//generate follwer link
export const generateInvite = async (req: Request, res: Response) => {
  const userId = req.user._id;
  try {
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res
        .status(403)
        .json({ message: "Only paid users can generate invites." });
    }
    const referralLink = `${frontend_url}/signup?ref=${user._id}`;
    res.json({ referralLink });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

//upload followers via csv
export const uploadFollowers = async (req: Request, res: Response) => {
  const csvHeaders = [
    "first_name",
    "last_name",
    "company_name",
    "address",
    "city",
    "country",
    "state",
    "zip",
    "phone1",
    "phone2",
    "email",
  ];

  const inviterId = req.user._id;
  try {
    const user = await User.findById(inviterId);
    if (!user || !user.isActive) {
      return res
        .status(403)
        .json({ message: "Only paid users can upload followers." });
    }

    // Ensure the uploaded file exists
    if (!req.files || !("csvFile" in req.files) || !req.files["csvFile"][0]) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const file = (req.files["csvFile"] as MulterFile[])[0];
    const csvFilePath = path.join(
      __dirname,
      "../uploads/followers",
      file.filename
    );
    console.log("Checking file at:", csvFilePath);
    if (!fs.existsSync(csvFilePath)) {
      return res.status(400).json({ message: "File does not exist." });
    }

    const followers: any[] = [];
    fs.createReadStream(csvFilePath)
      .pipe(csvParser({ headers: csvHeaders, skipLines: 1 }))
      .on("data", (row) => {
        followers.push({
          inviterId,
          firstName: row.first_name,
          lastName: row.last_name,
          companyName: row.company_name,
          address: row.address,
          city: row.city,
          country: row.country,
          state: row.state,
          zip: row.zip,
          phone1: row.phone1,
          phone2: row.phone2,
          email: row.email,
          status: "Pending",
          referralCode: user._id,
        });
      })
      .on("end", async () => {
        for (const followerData of followers) {
          const existingFollower = await Follower.findOne({
            email: followerData.email,
          });
          if (existingFollower) {
            // Update existing follower
            await Follower.findOneAndUpdate(
              { email: followerData.email },
              {
                inviterId: followerData.inviterId,
                firstName: followerData.firstName,
                lastName: followerData.lastName,
                companyName: followerData.companyName,
                address: followerData.address,
                city: followerData.city,
                country: followerData.country,
                state: followerData.state,
                zip: followerData.zip,
                phone1: followerData.phone1,
                phone2: followerData.phone2,
                status: followerData.status,
                referralCode: followerData.referralCode,
              }
            );
          } else {
            // Insert new follower
            const newFollower = new Follower(followerData);
            await newFollower.save();
          }
        }
        // await Follower.insertMany(followers);
        // Delete file after processing
        if (fs.existsSync(csvFilePath)) {
          fs.unlinkSync(csvFilePath);
        }
        res.json({ message: "Followers uploaded successfully!" });
      });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

//send invitations to followers by using mailgun
export const sendInvites = async (req: Request, res: Response) => {
  try {
    const followerId = req.params.id;
    const inviterId = req.user._id;

    const follower = await Follower.findById(followerId);
    if (!follower) {
      return res.status(403).json({ message: "Follower not found" });
    }

    const inviter = await User.findById(inviterId);
    if (!inviter || !inviter.isActive) {
      return res
        .status(403)
        .json({ message: "Only paid users can send invites." });
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY || "your-mailgun-api-key",
    });

    const inviteLink = `${frontend_url}/signup?ref=${follower.referralCode}`;
    const htmlContent = sendInvitesTemplate(
      String(inviteLink),
      String(follower.firstName),
      String(follower.lastName)
    );
    const emailData = {
      from: `Best Global AI Team <admin@${process.env.MAILGUN_DOMAIN}>`,
      to: follower.email,
      subject: "You're Invited to Join!",
      html: htmlContent,
    };

    await mg.messages.create(
      process.env.MAILGUN_DOMAIN || "your-mailgun-domain",
      emailData
    );

    res.json({ message: "Invitations sent!" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

//update follower status by signup
export const updateFollowerStatus = async (req: Request, res: Response) => {
  try {
    const follower = await Follower.findById(req.params.id);
    if (!follower)
      return res.status(404).json({ message: "Follower not found" });
    const updatedFollower = await Follower.findByIdAndUpdate(
      req.params.id,
      { status: "Active" },
      { new: true }
    );
    res.status(200).json(updatedFollower);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Get all followers
export const getFollowers = async (req: Request, res: Response) => {
  //getfollowers must get has inviterId by req.user._id
  const inviterId = req.user._id;
  try {
    //followers find by inviterId
    const followers = await Follower.find({ inviterId });
    const emails = followers.map((f) => f.email);
    const existingUsers = await User.find({ email: { $in: emails } });

     const followersWithStatus = followers.map((follower) => {
      const isRegistered = existingUsers.some((u) => u.email === follower.email);
      return {
        ...follower.toObject(),
        status: isRegistered ? "Active" : follower.status,
      };
    });

    res.json({ followers: followersWithStatus });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Add a new follower
export const addFollower = async (req: Request, res: Response) => {
  const follower = new Follower(req.body);
  try {
    const newFollower = await follower.save();
    res.status(201).json(newFollower);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
};

// Delete a follower
export const deleteFollower = async (req: Request, res: Response) => {
  try {
    const follower = await Follower.findById(req.params.id);
    if (!follower)
      return res.status(404).json({ message: "Follower not found" });

    await Follower.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: "Follower deleted" });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// Get a follower
export const getFollower = async (req: Request, res: Response) => {
  const follower = await Follower.findById(req.params.id);
  res.json(follower);
};


export const sendBulkInvites = async (req: Request, res: Response) => {
  const { followerIds } = req.body;
  const inviterId = req.user._id;

  const inviter = await User.findById(inviterId);
  if (!inviter || !inviter.isActive) {
    return res.status(403).json({ message: "Only paid users can send invites." });
  }

  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY!,
  });

  const followers = await Follower.find({ _id: { $in: followerIds } });
  const sentEmails: string[] = [];

  for (const follower of followers) {
    const inviteLink = `${frontend_url}/signup?ref=${follower.referralCode}`;
    const htmlContent = sendInvitesTemplate(
      String(inviteLink),
      String(follower.firstName),
      String(follower.lastName)
    );

    const emailData = {
      from: `Best Global AI Team <admin@${process.env.MAILGUN_DOMAIN}>`,
      to: follower.email,
      subject: "You're Invited to Join!",
      html: htmlContent,
    };

    await mg.messages.create(process.env.MAILGUN_DOMAIN!, emailData);
    sentEmails.push(follower.email);
  }

  res.json({ message: `Invitations sent to ${sentEmails.length} followers.` });
};


export const deleteBulkFollowers = async (req: Request, res: Response) => {
  const { followerIds } = req.body;
  try {
    await Follower.deleteMany({ _id: { $in: followerIds } });
    res.status(200).json({ message: "Selected followers deleted." });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
