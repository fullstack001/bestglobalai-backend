import { Schema, model } from "mongoose";

const TeamUserSchema = new Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      trim: true,
    },
    memberName: {
      type: String,
      required: true,
      trim: true,
    },
    memberEmail: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const TeamUser = model("TeamUser", TeamUserSchema);

export default TeamUser;
