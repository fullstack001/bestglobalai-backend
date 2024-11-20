import mongoose, { Document, Schema } from "mongoose";

// Define the types for the book
interface Page {
  name: string;
  content: string;
}

interface AudioItem {
  title: string;
  fileUrl: string;
}

interface VideoItem {
  title: string;
  fileUrl: string;
}

interface YoutubeItem {
  title: string;
  link: string;
}

// Define the Book interface extending mongoose.Document
export interface BookDocument extends Document {
  title: string;
  author: string;
  coverImage?: string; // Optional
  pages: Page[];
  audioItems: AudioItem[];
  videoItems: VideoItem[];
  youtubeItems: YoutubeItem[];
  ebookFile?: string; // Optional
  watermarkFile?:string;
  bookType?:string;
}

// Create the Book schema
const BookSchema: Schema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  coverImage: { type: String }, // URL to the cover image
  pages: [
    {
      name: String,
      content: String,
    },
  ],
  audioItems: [
    {
      title: String,
      fileUrl: String,
    },
  ],
  videoItems: [
    {
      title: String,
      fileUrl: String,
    },
  ],
  youtubeItems: [
    {
      title: String,
      link: String,
    },
  ],
  ebookFile: { type: String }, // Optional
  watermarkFile: { type: String }, // Optional
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookType: {type: String},
});

// Export the model using the BookDocument interface
const Book = mongoose.model<BookDocument>("Book", BookSchema);

export default Book;
