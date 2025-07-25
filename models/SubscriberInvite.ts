import mongoose, { Document, Schema } from "mongoose";

interface ISubscriberInvite extends Document {  
  subscriberId: mongoose.Schema.Types.ObjectId;
  bookId: mongoose.Schema.Types.ObjectId;
  uuid: string;
  viewed: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;  
}

const SubscriberInviteSchema = new Schema<ISubscriberInvite>({  
    subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    uuid: { type: String, required: true, unique: true },
    viewed: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true } 
);

const SubscriberInvite = mongoose.model<ISubscriberInvite>("SubscriberInvite", SubscriberInviteSchema);

export default SubscriberInvite;
