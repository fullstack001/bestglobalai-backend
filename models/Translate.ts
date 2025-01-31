import mongoose, { Schema, Document } from "mongoose";

// Define an interface for the Translate document
interface ITranslate extends Document {
    video_translate_id?: string;
    user: mongoose.Schema.Types.ObjectId;
    temp?: string;
}

// Define the schema
const TranslateSchema = new Schema<ITranslate>({
    video_translate_id: { type: String },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    temp: { type: String },
});

// Export the model
export default mongoose.model<ITranslate>("Translate", TranslateSchema);
