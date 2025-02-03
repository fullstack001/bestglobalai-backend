import express from "express";
import {
  createVideo,
  getVideos,
  deleteVideo,
} from "../controllers/videoController";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  translateVideo,
  getTranslatedVideo,
} from "../controllers/translateVideoController";
import {
  upload,
  serveTranslatedFile,
} from "../controllers/translateVideoController";

const router = express.Router();

router.post("/create-video", authenticateToken, createVideo);
router.get("/get-videos", authenticateToken, getVideos);
router.get("/get-translated-video", authenticateToken, getTranslatedVideo);
router.post(
  "/translate-video",
  authenticateToken,
  upload.single("file"),
  translateVideo
);
router.get("/translate-video/file/:filename", serveTranslatedFile);
router.delete("/delete-video/:videoId", deleteVideo);

export default router;
