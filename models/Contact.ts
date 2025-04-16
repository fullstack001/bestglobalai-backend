import mongoose, { Document, Schema } from "mongoose";

export interface ContactDocument extends Document {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  content?: string;
  replied: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String, required: true },
    replied: { type: Boolean, default: false },
    phone: { type: String },
    content: { type: String },
  },
  { timestamps: true }
);

const Contact = mongoose.model<ContactDocument>("Contact", ContactSchema);

export default Contact;
