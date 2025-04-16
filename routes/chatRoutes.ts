import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { getMessages, sendMessage } from "../controllers/chatController";
import { getChatTeamUsers } from "../controllers/userController";

const router = express.Router();

router.post("/messages/current-message", authenticateToken, getMessages);
router.post("/messages", authenticateToken, sendMessage);
router.get("/users/:email", authenticateToken, getChatTeamUsers);

export default router;
