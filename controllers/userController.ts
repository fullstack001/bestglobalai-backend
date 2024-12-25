import { Request, Response } from "express";
import User from "../models/User";
import multer from "multer";
import path from "path";

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
    const users = await User.find({ role: { $ne: "superAdmin" } });
    res.status(200).json(users);
  } catch (err) {
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

    res.status(200).json(user);
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
    const existingAdmin = await User.findOne({ email: "admin@test.test" });
    if (!existingAdmin) {
      const adminUser = new User({
        fullName: "SuperAdmin",
        email: "admin@bestglobalai.com",
        password: "123.123",
        role: "superAdmin",
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
