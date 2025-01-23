import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  email: { type: String, required: true },
  plan: { type: String, required: true },
  frequency: { type: String, enum: ["free", "monthly", "yearly"], required: true },
  subscribedDate: { type: Date, required: true, default: Date.now },
  expiryDate: { type: Date, required: true },
});

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;