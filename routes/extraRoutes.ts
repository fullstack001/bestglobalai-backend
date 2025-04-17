import express from "express";
const router = express.Router();

import {
  createPaymentIntent,
  requestPurchase,
  getExtraPurchase,
} from "../controllers/extraController";

router.post("/create-payment-intent", createPaymentIntent);
router.post("/purchase-request", requestPurchase);
router.get("/", getExtraPurchase);

export default router;
