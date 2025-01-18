import express, { Request, Response } from "express";
import dotenv from "dotenv";
import Mailgun from "mailgun.js";
import formData from "form-data";

// Load environment variables
dotenv.config();

// Initialize Mailgun
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "your-mailgun-api-key",
});


// Email Sending Service
export const sendEmailServices = async (req: Request, res: Response) => {
  const { email, selectedAPIs } = req.body;

  // Validate request data
  if (!email || !selectedAPIs || selectedAPIs.length === 0) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  // Mailgun email data
  const data = {
    from: `Best Global AI Team <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to: email,
    subject: "Your Selected APIs",
    text: `Thank you for selecting the following APIs:\n\n${selectedAPIs.join(
      "\n"
    )}\n\nBest Regards,\nBest Global AI Team`,
  };

  try {
    // Send email via Mailgun
    const response = await mg.messages.create(process.env.MAILGUN_DOMAIN || "", data);
    console.log("Mailgun Response:", response);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};

