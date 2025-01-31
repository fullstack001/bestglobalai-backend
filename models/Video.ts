import mongoose, { Schema, Document } from "mongoose";

interface IVideo extends Document {
    user:mongoose.Schema.Types.ObjectId;
    background:string;
    avatar:object;
    video_name:string;
    video_id:string;
    status:string;
    download_url:String;
    language:string;
    date: Date
}

const VideoSchema = new Schema<IVideo>({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true       
    },
    background:String,
    video_id:{type:String, required:true},
    video_name:String,
    status:String,
    download_url:String,
    language:{type:String},
    date:{
        type: Date,
        default: Date.now
    }
});

const Video = mongoose.model<IVideo>("Video", VideoSchema);

export default Video;





