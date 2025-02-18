import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import moment from "moment";
import mg from "mailgun-js";
import crypto from "crypto";

import User from "../models/User";
import {
  validationCodeContent,
  resetPasswordLink,
} from "../config/mailTemplate";

const mailgun = mg({
  apiKey: process.env.MAILGUN_API_KEY || "",
  domain: process.env.MAILGUN_DOMAIN || "",
});

const signup = async (req: Request, res: Response) => {
  const { fullName, email, password, confirm_password } = req.body;

  if (password !== confirm_password) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists." });
    }

    const validationCode = `${Math.floor(100000 + Math.random() * 900000)}`;
    const validationCodeExpiration = moment().add(10, "minutes").toDate();

    const user = new User({
      fullName,
      email,
      password,
      validationCode,
      validationCodeExpiration,
    });

    await user.save();

    await sendValidationEmail(user.email, user.fullName, validationCode);

    res.status(200).json({
      msg: "Signup successful. Verification code sent to your email.",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
};

const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide both email and password." });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    res.json({ token, user: user });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.userId; // Assuming `userId` is set in middleware
    const user = await User.findById(userId).select("-password"); // Exclude password

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const verifyCode = async (req: Request, res: Response) => {
  const { email, validationCode } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.isActive) {
      return res.status(400).json({ msg: "User is already verified" });
    }

    if (Number(user.validationCode) !== Number(validationCode)) {
      return res.status(400).json({ msg: "Invalid code" });
    }

    if (moment().isAfter(user.validationCodeExpiration)) {
      return res.status(400).json({ msg: "Verification code has expired" });
    }

    // Activate the user
    user.isActive = true;
    user.validationCode = "";
    await user.save();

    const newUserData = await User.findOne({ email });

    // Create JWT token
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    res.json({ token, user: user });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

export const resendCode = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.isActive) {
      return res.status(400).json({ msg: "User is already verified" });
    }

    const validationCode = `${Math.floor(100000 + Math.random() * 900000)}`;
    const validationCodeExpiration = moment().add(10, "minutes").toDate();

    user.validationCode = validationCode;
    user.validationCodeExpiration = validationCodeExpiration;
    await user.save();

    await sendValidationEmail(user.email, user.fullName, validationCode);

    res.status(200).json({ msg: "Verification code resent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

async function sendValidationEmail(
  email: string,
  name: string,
  validationCode: string
) {
  const emailData = {
    from: `Best Global AI Team <admin@${process.env.MAILGUN_DOMAIN}>`,
    to: email,
    subject: "Email Verification Code",
    html: validationCodeContent(name, validationCode),
  };

  return new Promise((resolve, reject) => {
    mailgun.messages().send(emailData, (error, body) => {
      if (error) {
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
}

export const requestResetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "No user found with this email" });
    }

    // Generate a reset token that expires in 1 hour
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpire = moment().add(10, "minutes").toDate();

    // Store the token and expiration in the user's record
    user.resetToken = resetToken;
    user.resetTokenExpiration = resetTokenExpire;
    await user.save();

    // Create reset URL
    const htmlContent = resetPasswordLink(user.fullName, resetToken);

    // Mailgun email configuration
    const data = {
      from: `Best Global AI Team <admin@${process.env.MAILGUN_DOMAIN}>`,
      to: email,
      subject: "Password Reset Request",
      html: htmlContent,
    };

    // Send the email
    mailgun.messages().send(data, (error, body) => {
      if (error) {
        return res.status(500).json({ msg: "Failed to send email" });
      }
      res.json({ msg: "Reset link sent to your email" });
    });
  } catch (error) {
    res.status(500).send("Server error");
  }
};

export const ResetPassword = async (req: Request, res: Response) => {
  const { newPassword, resetToken } = req.body;

  try {
    const user = await User.findOne({ resetToken });
    if (!user) {
      return res.status(400).json({ msg: "No user found with this email" });
    }
    if (resetToken !== user.resetToken) {
      return res.status(400).json({ msg: "Invalid token" });
    }
    if (moment().isAfter(user.resetTokenExpiration)) {
      return res.status(400).json({ msg: "Token has expired" });
    }
    user.password = newPassword;
    user.resetToken = "";
    await user.save();
    res.json({ msg: "Password reset successful" });
  } catch (err) {
    res.status(500).send("Server error");
  }
};

export { signup, login };
