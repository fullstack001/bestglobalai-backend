import express from "express";
import {
  signup,
  login,
  getCurrentUser,
  verifyCode,
  resendCode,
  requestResetPassword,
  ResetPassword,
} from "../controllers/authController";
import validateSignup from "../middlewares/validateSignup";
import { authMiddleware, validateCaptcha } from "../middlewares/authMiddleware";

const router = express.Router();
router.post("/login", validateCaptcha, login);
router.post("/signup", validateSignup, validateCaptcha, signup);
router.post("/verify", verifyCode);
router.post("/resend", resendCode);
router.get("/me", authMiddleware, getCurrentUser);
router.post("/forgot-password", requestResetPassword);
router.post("/reset-password", ResetPassword);

export default router;
