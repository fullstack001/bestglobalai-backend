import { Schema, model } from "mongoose";

const TeamUserSchema = new Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    memberName: {
      type: String,
      required: true,
    },
    memberEmail: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const TeamUser = model("TeamUser", TeamUserSchema);

export default TeamUser;
