import express from "express";
import {
  getUsers,
  updateUserRole,
  deleteUser,
  updateProfile,
  getProfile,
  changePassword,
} from "../controllers/userController";

import verifyRole from "../middlewares/roleMiddleware";
import {
  authenticateToken,
  authenticateUser,
} from "../middlewares/authMiddleware";

const router = express.Router();

// Update user role (admin access only)

router.get("/", getUsers);
router.put("/role", verifyRole(["superAdmin"]), updateUserRole);
router.delete("/:id", deleteUser);
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.put("/change-password", authenticateUser, changePassword);

export default router;
