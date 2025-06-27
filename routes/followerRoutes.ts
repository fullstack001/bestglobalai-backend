import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import {
  generateInvite,
  uploadFollowers,
  sendInvites,
  updateFollowerStatus,
  getFollowers,
  addFollower,
  deleteFollower,
  getFollower,
  sendBulkInvites,
  deleteBulkFollowers
} from "../controllers/followerController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

// Multer setup for file uploads (coverImage, audioFiles, videoFiles)
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, "uploads/followers/");
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to filename to avoid conflicts
  },
});

const upload = multer({
  storage,
  limits: { fieldSize: 1024 * 1024 * 1024, fileSize: 1024 * 1024 * 1024 },
});

router.get("/generateInvite/:userId", authenticateToken, generateInvite);
router.post(
  "/uploadFollowers",
  authenticateToken,
  upload.fields([{ name: "csvFile", maxCount: 1 }]),
  uploadFollowers
);

router.post("/sendInvites/:id", authenticateToken, sendInvites);
router.get("/all/:id", authenticateToken, getFollowers);
router.get("/:id", authenticateToken, getFollower);
router.post("/", authenticateToken, addFollower);
router.put("/:id", authenticateToken, updateFollowerStatus);
router.delete("/:id", authenticateToken, deleteFollower);
router.post("/sendBulkInvites", authenticateToken, sendBulkInvites);
router.post("/deleteBulkFollowers", authenticateToken, deleteBulkFollowers);

export default router;
