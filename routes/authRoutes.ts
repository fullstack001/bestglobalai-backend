import express from "express";
import {
  signup,
  login,
  getCurrentUser,
  verifyCode,
  resendCode,
} from "../controllers/authController";
import validateSignup from "../middlewares/validateSignup";
import { authMiddleware, validateCaptcha } from "../middlewares/authMiddleware";

const router = express.Router();
router.post("/login", validateCaptcha, login);
router.post("/signup", validateSignup, validateCaptcha, signup);
router.post("/verify", verifyCode);
router.post("/resend", resendCode);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
