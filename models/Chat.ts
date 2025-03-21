import mongoose, { Document, Schema } from 'mongoose';

interface IChat extends Document {
  sender: mongoose.Schema.Types.ObjectId;
  receiver: mongoose.Schema.Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const Chat = mongoose.model<IChat>("Chat", chatSchema);

export default Chat;
