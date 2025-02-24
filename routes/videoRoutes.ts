import express from "express";
import {
  createVideo,
  getVideos,
  deleteVideo,
  generateFileUrl,
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
router.post("/background-upload", upload.single("file"), generateFileUrl);
router.get("/translate-video/file/:filename", serveTranslatedFile);
router.delete("/delete-video/:videoId", deleteVideo);

export default router;
