import { Request, Response } from "express";
import multer from "multer";
import path from "path";

import User from "../models/User";
import Subscription from "../models/Subscription";
import Video from "../models/Video";
import Translate from "../models/Translate";
import TeamUser from "../models/TeamUser";

// Update user role (Admin only)
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;

    // Validate the role
    const validRoles = ["user", "admin", "editor"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User role updated successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    // Get users excluding superAdmins
    const users = await User.find({ role: { $ne: "superAdmin" } });

    // Map users and attach subscription, video count, translation count
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const subscription = await Subscription.findOne({ user: user._id });
        const videoCount = await Video.countDocuments({ user: user._id });
        const translatedCount = await Translate.countDocuments({
          user: user._id,
        });

        return {
          ...user.toObject(),
          subscription: subscription?.plan || "Free",
          subscriptionExpiry: subscription?.expiryDate || null,
          createdVideo: videoCount,
          translatedVideo: translatedCount,
        };
      })
    );

    res.status(200).json(enrichedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", err });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id; // Get user ID from the authenticated user
    const user = await User.findById(userId).select("-password"); // Exclude the password field

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the user's active subscription
    const subscription = await Subscription.findOne({ user: userId }).sort({
      expiryDate: -1,
    });

    // Merge subscription data into the user object
    return res.status(200).json({
      user,
      subscription,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/profileImages"); // Directory for profile images
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png") {
      console.log("LIMIT_UNEXPECTED_FILE");
    }
    cb(null, true);
  },
}).single("profileImage");

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id; // Get the logged-in user ID

    // Use multer to handle the file upload
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      const { fullName, phoneNumber } = req.body;
      const profileImage = req.file
        ? `/uploads/profileImages/${req.file.filename}`
        : null;

      const updatedData: any = { fullName, phoneNumber };
      if (profileImage) updatedData.profileImage = profileImage; // Update image if provided

      const updatedUser = await User.findByIdAndUpdate(userId, updatedData, {
        new: true,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json(updatedUser);
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error });
  }
};

export const createDefaultAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({
      email: "admin@bestglobalai.com",
    });
    if (!existingAdmin) {
      const adminUser = new User({
        fullName: "SuperAdmin",
        email: "admin@bestglobalai.com",
        password: "123.123",
        role: "superAdmin",
        isActive: true,
      });
      await adminUser.save();
      console.log("Default admin user created");
    } else {
      console.log("SuperAdmin already exist");
    }
  } catch (error) {
    console.error("Error creating default admin user:", error);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const userId = req.user._id; // Assuming `req.user` contains the authenticated user's data
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    user.password = newPassword; // The `pre("save")` hook in the model will hash this password
    await user.save();

    res.status(200).json({ message: "Password changed successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to change password.", error });
  }
};

export const getTeamUsers = async (req: Request, res: Response) => {
  const { email } = req.body; // Get the email from the request body
  try {
    const users = await TeamUser.find({ ownerEmail: email });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
};

export const addTeamUsers = async (req: Request, res: Response) => {
  const { ownerEmail, memberName, memberEmail } = req.body; // Get the email from the request body
  try {
    const existingUser = await TeamUser.findOne({
      ownerEmail,
      memberEmail,
    });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user = await User.findOne({ email: ownerEmail });
    const newTeamUser = new TeamUser({
      ownerEmail,
      ownerName: user?.fullName,
      memberName,
      memberEmail,
    });
    await newTeamUser.save();
    res.status(200).json(newTeamUser);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
};

export const removeTeamUsers = async (req: Request, res: Response) => {
  const { id } = req.params; // Get the email from the request body
  console.log(id);
  try {
    const deletedUser = await TeamUser.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
};

export const getChatTeamUsers = async (req: Request, res: Response) => {
  const { email } = req.params;

  try {
    // Step 1: Find teams where user is owner or member
    const relatedTeams = await TeamUser.find({
      $or: [{ ownerEmail: email }, { memberEmail: email }],
    });

    // Step 2: Get all unique ownerEmails
    const ownerEmails = [
      ...new Set(relatedTeams.map((team) => team.ownerEmail)),
    ];

    // Step 3: Get all team users under those owners
    const allTeamUsers = await TeamUser.find({
      ownerEmail: { $in: ownerEmails },
    });

    // Step 4: Remove duplicates by memberEmail
    const uniqueUsersMap = new Map();
    allTeamUsers.forEach((user) => {
      if (!uniqueUsersMap.has(user.memberEmail)) {
        uniqueUsersMap.set(user.memberEmail, user);
      }
    });

    const uniqueUsers = Array.from(uniqueUsersMap.values());

    res.status(200).json(uniqueUsers);
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
};
