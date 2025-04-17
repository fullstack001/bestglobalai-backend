import stripe from "stripe";
import { Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();

import { mailSender } from "../config/mailSender";
import { extraServicePaymentSuccessAdmin } from "../config/mailTemplate";
import { extraServiceUserEmail } from "../config/mailTemplate";

import ExtraService from "../models/extraService";
import User from "../models/User";
const key = process.env.STRIPE_SECRET_KEY || "";
const stripeInstance = new stripe(key);

export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount,
      currency: "usd",
    });

    res.status(200).send(paymentIntent.client_secret);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const requestPurchase = async (req: Request, res: Response) => {
  const { email, extra } = req.body;
  try {
    const user = await User.findOne({ email });
    const service = new ExtraService({
      email,
      serviceId: extra.id,
      status: false,
      paymentDate: new Date(),
    });
    await service.save();
    const userHtml = extraServiceUserEmail(user?.fullName || "", extra);
    const adminHtml = extraServicePaymentSuccessAdmin(
      user?.fullName || "",
      user?.email || "",
      extra
    );
    await mailSender(email, "Extra Service Purchase", userHtml);
    await mailSender(
      process.env.ADMIN_EMAIL || "",
      "Extra Service Purchase",
      adminHtml
    );
    res.status(200).send(service);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getExtraPurchase = async (req: Request, res: Response) => {
  try {
    const extras = await ExtraService.find();
    res.json(extras);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
