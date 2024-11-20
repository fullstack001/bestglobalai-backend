import { Request, Response, NextFunction } from "express";

const validateSignup = (req: Request, res: Response, next: NextFunction) => {
  const { fullName, email, password, confirm_password } = req.body;

  if (!fullName || !email || !password || !confirm_password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Additional validation (e.g., email format, password strength) can be added here.

  next();
};

export default validateSignup;
