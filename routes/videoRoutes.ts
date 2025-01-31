import express from "express";
import { createVideo, getVideos } from "../controllers/videoController";
import { authenticateToken } from "../middlewares/authMiddleware";
import { translateVideo } from "../controllers/translateVideoController";

const router = express.Router();

router.post("/create-video", authenticateToken, createVideo);
router.get("/get-videos", authenticateToken, getVideos);
router.post("/translate-video", authenticateToken, translateVideo);

export default router;
