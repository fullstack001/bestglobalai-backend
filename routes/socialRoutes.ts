import express from "express";
import {
  createUserProfile,
  socialLinkManage,
} from "../controllers/socialController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/create-user-profile", authenticateToken, createUserProfile);
router.post("/social-link-manage", authenticateToken, socialLinkManage);

export default router;
