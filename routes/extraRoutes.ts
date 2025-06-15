import express from "express";
const router = express.Router();

import {
  createPaymentIntent,
  requestPurchase,
  getExtraPurchase,
  requestIndividual
} from "../controllers/extraController";

router.post("/create-payment-intent", createPaymentIntent);
router.post("/purchase-request", requestPurchase);
router.post("/individual-request", requestIndividual);
router.get("/", getExtraPurchase);

export default router;
