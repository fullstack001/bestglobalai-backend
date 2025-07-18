import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import moment from "moment";
import mg from "mailgun-js";
import crypto from "crypto";

import User from "../models/User";
import Category from "../models/Category";
import Follower from "../models/Follower";
import Subscription from "../models/Subscription";
import {
  validationCodeContent,
  resetPasswordLink,
} from "../config/mailTemplate";

const mailgun = mg({
  apiKey: process.env.MAILGUN_API_KEY || "",
  domain: process.env.MAILGUN_DOMAIN || "",
});

const signup = async (req: Request, res: Response) => {
  const { fullName, email, password, confirm_password, referralCode } =
    req.body;

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
      referralCode: referralCode,
    });

    await user.save();

    if (referralCode) {
      const existingFollower = await Follower.findOne({ email });
      if (existingFollower) {
        await Follower.findOneAndUpdate(
          { email },
          {
            status: "Active",
            inviterId: referralCode,
          }
        );
      } else {
      
      let defaultCategory = await Category.findOne({
        user: referralCode,
        isDefault: true,
      });

      if (!defaultCategory) {
        // create it if it doesn't exist
        defaultCategory = await Category.create({
          user: referralCode,
          name: "Default",
          isDefault: true,
        });
      }
      const newFollower = new Follower({
        email,
        inviterId: referralCode,
        status: "Active",
        firstName: fullName.split(" ")[0],
        lastName: fullName.split(" ")[1] || "",
        referralCode: referralCode,
        category: defaultCategory._id,
      });
      
      await newFollower.save();
      }
    }

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
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isActive) {
      // Generate a new validation code and expiration
      const validationCode = `${Math.floor(100000 + Math.random() * 900000)}`;
      const validationCodeExpiration = moment().add(10, "minutes").toDate();

      user.validationCode = validationCode;
      user.validationCodeExpiration = validationCodeExpiration;
      await user.save();

      // Send validation email
      await sendValidationEmail(user.email, user.fullName, validationCode);

      return res.status(429).json({
        message:
          "Please verify your email before logging in. A new verification code has been sent to your email.",
      });
    }

    if (!(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const userId = user._id;
    const subscription = await Subscription.findOne({ user: userId }).sort({
      expiryDate: -1,
    });

    const validSubscription =
      subscription && moment().isBefore(subscription.expiryDate)
        ? subscription
        : null;

    if (user.role !== "superAdmin" && !validSubscription) {
      user.role = "user";
      await user.save();
    }

    if (!validSubscription) await subscription?.deleteOne();

    const isTrial =
      !validSubscription && moment().diff(user.createdAt, "days") <= 7;

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "10h" }
    );

    const filteredUser = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      ayrshareRefId: user.ayrshareRefId,
      trial: isTrial,
    };

    res.json({ token, user: filteredUser, subscription: validSubscription });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const subscription = await Subscription.findOne({ user: user._id }).sort({
      expiryDate: -1,
    });

    const validSubscription =
      subscription && moment().isBefore(subscription.expiryDate)
        ? subscription
        : null;

    const isTrial =
      !validSubscription && moment().diff(user.createdAt, "days") <= 7;

    return res.status(200).json({ user, subscription, isTrial });
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

    user.isActive = true;
    user.validationCode = "";
    await user.save();

    const subscription = await Subscription.findOne({ user: user._id }).sort({
      expiryDate: -1,
    });

    const validSubscription =
      subscription && moment().isBefore(subscription.expiryDate)
        ? subscription
        : null;

    if (user.role !== "superAdmin" && !validSubscription) {
      user.role = "user";
      await user.save();
    }

    if (!validSubscription) await subscription?.deleteOne();

    const isTrial =
      !validSubscription && moment().diff(user.createdAt, "days") <= 7;

    const filteredUser = {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      ayrshareRefId: user.ayrshareRefId,
      trial: isTrial,
    };

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "10h" }
    );

    res.json({ token, user: filteredUser, subscription: validSubscription });
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
        console.log("Email sent successfully:", body);
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

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpire = moment().add(10, "minutes").toDate();

    user.resetToken = resetToken;
    user.resetTokenExpiration = resetTokenExpire;
    await user.save();

    const htmlContent = resetPasswordLink(user.fullName, resetToken);

    const data = {
      from: `Best Global AI Team <admin@${process.env.MAILGUN_DOMAIN}>`,
      to: email,
      subject: "Password Reset Request",
      html: htmlContent,
    };

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
