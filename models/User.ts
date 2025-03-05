import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  role: "superAdmin" | "user" | "admin" | "editor";
  phoneNumber: string;
  profileImage: string;
  ayrshareRefId: string;
  ayrshareProfileKey: string;
  validationCode: string;
  validationCodeExpiration: Date;
  resetToken: string;
  resetTokenExpiration: Date;
  isActive: boolean;
  referralCode: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["superAdmin", "user", "admin", "editor"],
    default: "user",
  },
  resetToken: {
    type: String,
  },
  resetTokenExpiration: Date,
  validationCode: {
    type: String,
  },
  validationCodeExpiration: Date,
  isActive: {
    type: Boolean,
    default: false, // By default, new users are inactive until they verify their email
  },
  ayrshareRefId: { type: String },
  ayrshareProfileKey: { type: String },
  phoneNumber: { type: String },
  profileImage: { type: String },
  referralCode: { type: String },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>("User", userSchema);

export default User;
