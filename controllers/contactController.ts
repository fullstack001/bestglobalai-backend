import { Request, Response } from "express";
import Contact from "../models/Contact";
import dotenv from "dotenv";
import Mailgun from "mailgun.js";
import formData from "form-data";

// Load environment variables
dotenv.config();

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "your-mailgun-api-key",
});

export const createContact = async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    const { firstName, lastName, email, phone, content } = req.body;

    if (!firstName || !email) {
      return res
        .status(400)
        .json({ message: "First name and email are required." });
    }

    const newContact = new Contact({
      firstName,
      lastName,
      email,
      phone,
      content,
    });
    await newContact.save();

    const data = {
      from: `Best Global AI Team <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: email,
      subject: "Contact Information Saved.",
      text: `Thank you for contact us:\n\n${content}\n\nBest Regards,\nBest Global AI Team`,
    };

    const response = await mg.messages.create(
      process.env.MAILGUN_DOMAIN || "",
      data
    );

    res.status(200).json({ message: "Contact sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create blog." });
  }
};

export const getContactPaginated = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const contacts = await Contact.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalContacts = await Contact.countDocuments();

    res.status(200).json({
      contacts,
      totalContacts,
      currentPage: Number(page),
      totalPages: Math.ceil(totalContacts / Number(limit)),
    });
  } catch (error) {
    console.error("Error fetching paginated blogs:", error);
    res.status(500).json({ message: "Failed to fetch blogs." });
  }
};


export const getContactDetail = async (req: Request, res: Response) => {
    try {
      const contactId = req.params.id;
      const contact = await Contact.findById(contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.status(200).json({ contact });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to retrieve contact content." });
    }
  };
