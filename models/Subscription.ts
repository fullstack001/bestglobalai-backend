import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  email: { type: String, required: true },
  plan: { type: String, required: true },
  frequency: {
    type: String,
    enum: ["free", "monthly", "yearly"],
    required: true,
  },
  subscriptionType: {
    type: String,
    enum: ["stripe", "paypal"],
  },
  totalPrice: { type: Number, default: 0 },
  subscriptionId: { type: String },
  subscribedDate: { type: Date, required: true, default: Date.now },
  expiryDate: { type: Date, required: true },

});

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
