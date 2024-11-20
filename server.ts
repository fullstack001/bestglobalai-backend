import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import setupSocket from "./utils/socket";


import bookRoutes from "./routes/bookRoutes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
// import chatRoutes from "./routes/chatRoutes";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
// app.use("/api/chats", chatRoutes);


// const httpServer = createServer(app);
// const io = new Server(httpServer, {
//     cors: {
//         origin: "*",
//     },
   
// });

// setupSocket(io);

app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/api", (req, res) => {
  res.send("API running");
});

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined in the environment variables");
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error", err));

const PORT = process.env.PORT || 5001;

// httpServer.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

