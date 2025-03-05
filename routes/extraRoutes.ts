import express from "express";
const router = express.Router();

import {
  createPaymentIntent,
  requestPurchase,
} from "../controllers/extraController";

router.post("/create-payment-intent", createPaymentIntent);
router.post("/purchase-request", requestPurchase);

export default router;
