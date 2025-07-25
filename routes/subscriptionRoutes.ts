import express from "express";

import {
  processPaypalPayment,
  createStripeSubscription,
  addSubscription,
  cancelSubscription,
  getSubscribers,
  sendBulkInvites,
  getSubscriptionTracks,
} from "../controllers/subscriptionController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/paypal", processPaypalPayment);
router.post("/create-subscription", createStripeSubscription);
router.post("/add-subscription", addSubscription);
router.post("/cancel-subscription", cancelSubscription);
router.get("/subscribers", getSubscribers);
router.post("/sendBulkInvites", authenticateToken, sendBulkInvites);
router.get("/subscription-tracks", authenticateToken, getSubscriptionTracks);


export default router;
