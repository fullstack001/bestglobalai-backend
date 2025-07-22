import mongoose, { Document, Schema } from "mongoose";

interface IInvite extends Document {
  inviterId: mongoose.Schema.Types.ObjectId;
  followerId: mongoose.Schema.Types.ObjectId;
  bookId: mongoose.Schema.Types.ObjectId;
  uuid: string;
  viewed: boolean;
  createdAt: Date;
  updatedAt: Date;  
}

const InviteSchema = new Schema<IInvite>({
  inviterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    followerId: { type: mongoose.Schema.Types.ObjectId, ref: "Follower", required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    uuid: { type: String, required: true, unique: true },
    viewed: { type: Boolean, default: false }
  },
  { timestamps: true } 
);

const Invite = mongoose.model<IInvite>("Invite", InviteSchema);

export default Invite;
