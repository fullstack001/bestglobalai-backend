import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from '../models/User';

// Extend the Request interface to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: any; // You can replace 'any' with a more specific type if needed
      userId?: string; // Added userId property
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.userId = decoded.userId; // Now this line will not cause an error
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid token." });
  }
};


export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access denied, no token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user; // Store user information in request
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};
