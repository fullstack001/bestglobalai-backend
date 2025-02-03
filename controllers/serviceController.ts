import { Request, Response } from "express";
import Service from "../models/Service";
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
export const createServiceOrder = async (req: Request, res: Response) => {
  const { email, selectedAPIs } = req.body;

  // Validate request data
  if (!email || !selectedAPIs || selectedAPIs.length === 0) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  const formattedAPIs = selectedAPIs
  .map((api: { label: string; link: string }) => `${api.label} (${api.link})`)
  .join("\n");

  const newService = new Service({
    email,
    selectedAPIs
  })

  await newService.save();

  // Mailgun email data
  const data = {
    from: `Best Global AI Team <admin@${process.env.MAILGUN_DOMAIN}>`,
    to: email,
    subject: "Your Selected APIs",
    text: `Thank you for selecting the following APIs:\n\n${formattedAPIs}\n\nBest Regards,\nBest Global AI Team`,
  };

  const adminData = {
    from: email,
    to: `admin@bestglobalai.com`,
    subject: "Customer Selected APIs",
    text: `APIs:\n\n${formattedAPIs}\n\n`,
  }

  try {
    // Send email via Mailgun
    const response = await mg.messages.create(process.env.MAILGUN_DOMAIN || "", data);
    const customerResponse = await mg.messages.create(process.env.MAILGUN_DOMAIN || "", adminData);
    // console.log("Mailgun Response:", response);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};


export const getServieOrderPaginated =  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10 } = req.query;
  
      const skip = (Number(page) - 1) * Number(limit);
  
      const services = await Service.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));
  
      const totalServices = await Service.countDocuments();
  
      res.status(200).json({
        services,
        totalServices,
        currentPage: Number(page),
        totalPages: Math.ceil(totalServices / Number(limit)),
      });
    } catch (error) {
      console.error("Error fetching paginated services:", error);
      res.status(500).json({ message: "Failed to fetch services." });
    }
  };

export const getServiceOrderDetail= async (req: Request, res: Response) => {
    try {
      const serviceId = req.params.id;
      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(404).json({ message: "Service order not found" });
      }
      res.status(200).json({ service });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to retrieve service order content." });
    }
  };

