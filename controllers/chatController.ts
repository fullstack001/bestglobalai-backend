import { Request, Response } from 'express';
import Chat from '../models/Chat';
import User from '../models/User';
import Subscription from '../models/Subscription';

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;   
    const messages = await Chat.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id },
      ],
    }).sort({ createdAt: 1 });
    if (!messages) return res.status(200).json([]);

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {   
  try {
    const { receiver, text } = req.body;
    const newMessage = new Chat({
      sender: req.user.id,
      receiver,
      text,
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPaidUsers = async (req: Request, res: Response) => {
  try {  
    const paidUsers = await Subscription.find({ expiryDate: { $gt: new Date() } }).populate("user");
    const paidUsers1 = await User.find({ role: "superAdmin" });    
    //combine both arrays
    const users = [...paidUsers.map((user) => user.user), ...paidUsers1];  
    //remove duplicates and req.user.id user
    const uniqueUsers = users.filter((user: any, index: number, self: any[]) =>
      index === self.findIndex((t: any) => t._id.toString() === user._id.toString())
    );
    const filteredUsers = uniqueUsers.filter((user: any) => user._id.toString() !== req.user.id);

    res.status(200).json(filteredUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
