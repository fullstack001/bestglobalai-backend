import express from "express";
import {
  getUsers,
  updateUserRole,
  deleteUser,
  updateProfile,
  getProfile,
  changePassword,
  getTeamUsers,
  addTeamUsers,
  removeTeamUsers,
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
router.post("/get-team-users", authenticateToken, getTeamUsers);
router.post("/add-team-user", authenticateToken, addTeamUsers);
router.delete("/delete-team-user/:id", removeTeamUsers);

export default router;
