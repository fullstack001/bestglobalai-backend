import express from "express";

import {
  processPaypalPayment,
  createStripeSubscription,
  addSubscription,
  cancelSubscription,
} from "../controllers/subscriptionController";

const router = express.Router();

router.post("/paypal", processPaypalPayment);
router.post("/create-subscription", createStripeSubscription);
router.post("/add-subscription", addSubscription);
router.post("/cancel-subscription", cancelSubscription);

export default router;
