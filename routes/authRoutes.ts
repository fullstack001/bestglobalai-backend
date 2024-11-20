import express from "express";
import { signup, login, getCurrentUser } from "../controllers/authController";
import validateSignup from "../middlewares/validateSignup";
import {authMiddleware} from "../middlewares/authMiddleware";

const router = express.Router();
router.post("/login", login);
router.post("/signup", validateSignup, signup);
router.get('/me', authMiddleware, getCurrentUser);

export default router;
