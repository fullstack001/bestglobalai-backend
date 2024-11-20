import Message from "../models/Message";

export const getChatHistory = async (room: string) => {
    return await Message.find({ room }).sort({ timestamp: 1 });
};

export const saveMessage = async (data: { sender: string; room: string; content: string }) => {
    const message = new Message(data);
    return await message.save();
};
