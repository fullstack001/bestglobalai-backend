import mongoose, { Document, Schema } from "mongoose";

// Define the Blog interface extending mongoose.Document
export interface BlogDocument extends Document {
  title: string;
  name: string;
  featuredImage?: string;
  content: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Blog schema
const BlogSchema: Schema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    name: { type: String, required: true, unique: true },
    featuredImage: { type: String },
    content: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Export the model using the BookDocument interface
const Blog = mongoose.model<BlogDocument>("Blog", BlogSchema);

export default Blog;
