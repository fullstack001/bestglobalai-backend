import express from "express";
import {
  getUsers,
  updateUserRole,
  deleteUser,
  updateProfile,
  getProfile,
} from "../controllers/userController";

import verifyRole from "../middlewares/roleMiddleware";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

// Update user role (admin access only)

router.get("/", getUsers);
router.put("/role", verifyRole(["admin"]), updateUserRole);
router.delete("/:id", deleteUser);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

export default router;
