import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { getMessages, sendMessage, getPaidUsers } from '../controllers/chatController';

const router = express.Router();

router.get('/messages/:userId', authenticateToken, getMessages);
router.post('/messages', authenticateToken, sendMessage);
router.get('/users', authenticateToken, getPaidUsers);

export default router;
