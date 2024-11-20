import mongoose, { Schema, Document } from "mongoose";

interface IMessage extends Document {
    sender: mongoose.Types.ObjectId; // ObjectId reference to User model
    room: string; // Room name or ID
    content: string; // Message content
    timestamp: Date; // Timestamp for the message
}

const messageSchema = new Schema<IMessage>({
    sender: { 
        type: Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    room: { 
        type: String, 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    },
});

const Message = mongoose.model<IMessage>("Message", messageSchema);

export default Message;
