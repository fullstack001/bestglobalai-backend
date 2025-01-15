import express from "express";

import {
  processPaypalPayment,
  processStripePayment,
} from "../controllers/paymentController";

const router = express.Router();

router.post("/paypal", processPaypalPayment);
router.post("/stripe", processStripePayment);

export default router;
