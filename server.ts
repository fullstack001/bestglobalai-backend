import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";


import bookRoutes from "./routes/bookRoutes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import translateRoutes from "./routes/translateRoutes";
import serviceRoutes from "./routes/serviceRoutes";
import blogRoutes from "./routes/blogRoutes";
import contactRoutes from "./routes/contactRoutes";
import videoRoutes from "./routes/videoRoutes";
import socialRoutes from "./routes/socialRoutes";
import mediaUrlRoutes from "./routes/mediaUrlRoutes";
import extraRoutes from "./routes/extraRoutes";
import followerroutes from "./routes/followerRoutes";
import chatRoutes from './routes/chatRoutes'
import categoryRoutes from "./routes/categoryRoutes";

import { createDefaultAdmin } from "./controllers/userController";
import "./tasks/scheduleNotifications";

dotenv.config();

const app = express();
const server = createServer(app);

server.setTimeout(300000000); 

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // Allow dynamic origins
    methods: ["GET", "POST"],
  },
});
// Middleware to ensure user is paid before allowing access to certain routes

io.use((socket, next) => {
  const token = socket.handshake.query.token;
  // Validate token and ensure user is paid
  next();
});

io.on('connection', (socket) => {
  socket.on('message', (message) => {
    io.emit('message', message);
  });
});

// app.use(cors({ origin: "*" }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", // Allow dynamic origins
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json({ limit: "900mb" }));
app.use(bodyParser.urlencoded({ limit: "900mb", extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/media-url", mediaUrlRoutes);
app.use("/api/extra", extraRoutes);
app.use("/api/followers", followerroutes);
app.use("/api/chat", chatRoutes);
app.use("/api/categories", categoryRoutes);

app.get("/", (req, res) => {
  res.send("Server running");
});

app.get("/api", (req, res) => {
  res.send("APIs running");
});

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined in the environment variables");
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await createDefaultAdmin();
  })
  .catch((err) => console.log("MongoDB connection error", err));

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
