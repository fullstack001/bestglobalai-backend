import mongoose, { Schema, Document } from "mongoose";

interface IChatMessage extends Document {
  senderId: mongoose.Schema.Types.ObjectId;
  roomId: string; // Room or group ID
  message: string;
  timestamp: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  roomId: { type: String, required: true }, // Room ID
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
