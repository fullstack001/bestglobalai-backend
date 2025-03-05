import mongoose from "mongoose";

const extraServiceSchema = new mongoose.Schema({
  email: { type: String, required: true },
  serviceId: { type: Number, required: true },
  paymentDate: { type: Date, required: true, default: Date.now },
  status: {
    type: Boolean,
  },
  completeDate: { type: Date },
});

const ExtraService = mongoose.model("extraService", extraServiceSchema);
export default ExtraService;
