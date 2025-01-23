import express from "express";

import {
  processPaypalPayment,
  processStripePayment,
} from "../controllers/subscriptionController";

const router = express.Router();

router.post("/paypal", processPaypalPayment);
router.post("/stripe", processStripePayment);

export default router;
