import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const verifyRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.header("Authorization")?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      const userRole = (decoded as any).role;

      if (!roles.includes(userRole)) {
        return res.status(403).json({ message: "Access denied. Insufficient permissions." });
      }

      next();
    } catch (err) {
      res.status(400).json({ message: "Invalid token." });
    }
  };
};

export default verifyRole;
