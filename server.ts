import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import setupSocket from "./utils/socket";


import bookRoutes from "./routes/bookRoutes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import { createDefaultAdmin } from "./controllers/userController";

dotenv.config();

const app = express();

// app.use(cors({ origin: "*" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*", // Allow dynamic origins
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(bodyParser.json({ limit: "900mb" }));
app.use(bodyParser.urlencoded({ limit: "900mb", extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);


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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

