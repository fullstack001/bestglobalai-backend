import mongoose from "mongoose";

const individualServiceSchema = new mongoose.Schema({
  email: { type: String, required: true },
  paymentDate: { type: Date, required: true, default: Date.now },
  status: {
    type: Boolean,
  },
  completeDate: { type: Date },
});

const IndividualService = mongoose.model("individualService", individualServiceSchema);

export default IndividualService;
