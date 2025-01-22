import mongoose, { Document, Schema } from "mongoose";

export interface ServiceDocument extends Document {
  email: string;
  selectedAPIs: Array<string>;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema: Schema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    selectedAPIs: { type: Array },
  },
  { timestamps: true }
);

const Service = mongoose.model<ServiceDocument>("Service", ServiceSchema);

export default Service;
