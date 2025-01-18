import mongoose, { Document, Schema } from "mongoose";

// Define the Blog interface extending mongoose.Document
export interface BlogDocument extends Document {
  title: string;  
  featuredImage?: string; 
  content: string; 
}

// Create the Blog schema
const BlogSchema: Schema = new mongoose.Schema({
  title: { type: String, required: true },  
  featuredImage: { type: String },
  content: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

});

// Export the model using the BookDocument interface
const Blog = mongoose.model<BlogDocument>("Blog", BlogSchema);

export default Blog;
