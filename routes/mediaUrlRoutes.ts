import express from "express";
const router = express.Router();

import { upload, getMediaUrl } from "../controllers/mediaUrlController";
import { authenticateToken } from "../middlewares/authMiddleware";

router.post("/", authenticateToken, upload.single("file"), getMediaUrl);

export default router;
