import express from "express";

import {
  processPaypalPayment,
  createStripeSubscription,
  addSubscription,
} from "../controllers/subscriptionController";

const router = express.Router();

router.post("/paypal", processPaypalPayment);
router.post("/create-subscription", createStripeSubscription);
router.post("/add-subscription", addSubscription);

export default router;
