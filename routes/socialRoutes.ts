import express from "express";
import {
  createUserProfile,
  socialLinkManage,
  postMedia,
  socialAnalytics,
} from "../controllers/socialController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/create-user-profile", authenticateToken, createUserProfile);
router.post("/social-link-manage", authenticateToken, socialLinkManage);
router.post("/post-media", authenticateToken, postMedia);
router.post("/social-analytics", authenticateToken, socialAnalytics);

export default router;
