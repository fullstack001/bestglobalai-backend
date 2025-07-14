import mongoose, { Document, Schema } from "mongoose";

interface IFollower extends Document {
  inviterId: mongoose.Schema.Types.ObjectId;
  firstName: String;
  lastName: String;
  companyName: String;
  address: String;
  city: String;
  country: String;
  state: String;
  zip: String;
  phone1: String;
  phone2: String;
  email: string;
  status: "Pending" | "Active";
  referralCode: string;
  category: mongoose.Schema.Types.ObjectId;
}

const followerSchema = new Schema<IFollower>({
  inviterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  firstName: { type: String},
  lastName: { type: String},
  companyName: { type: String},
  address: { type: String},
  city: { type: String},
  country: { type: String},
  state: { type: String},
  zip: { type: String},
  phone1: { type: String},
  phone2: { type: String},
  email: { type: String, required: true, unique: true },
  status: { type: String, enum: ["Pending", "Active"], default: "Pending" },
  referralCode: { type: String, required: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
});

const Follower = mongoose.model<IFollower>("Follower", followerSchema);

export default Follower;
