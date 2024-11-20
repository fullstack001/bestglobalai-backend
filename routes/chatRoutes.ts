import { Router } from "express";
import { getChatHistory } from "../controllers/chatController";

const router = Router();

router.get("/:room", async (req, res) => {
    try {
        const room = req.params.room;
        const history = await getChatHistory(room);
        res.status(200).json(history);
    } catch (err) {
        res.status(500).json({ error: "Error fetching chat history" });
    }
});

export default router;
