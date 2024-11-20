import mongoose from "mongoose";

export interface IAuthorizeUser extends Document{
  userId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
  title: string;
  role: string;
  selectedCountryId: string;
  selectedStateId: string;
  selectedCityId: string;
  description: string; 
  status: string;
  created: Date;
  image: string;
}

const AuthorizeUserSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstName: { type: String },
  middleName: { type: String },
  lastName: { type: String},
  userName: { type: String, required: true },  
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String},
  whatsapp: { type: String },
  title: { type: String },  
  role: { type: String, default: "User" },
  selectedCountryId: { type: String },
  selectedStateId: {type: String},
  selectedCityId: { type: String },
  description: {type: String},
  status: { type: String, default: "Active" },
  created: { type: Date, default: Date.now },
  image: { type: String },
});

export default mongoose.model<IAuthorizeUser>("AuthorizeUser", AuthorizeUserSchema);
