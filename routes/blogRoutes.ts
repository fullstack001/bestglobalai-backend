import express, { Request, Response } from "express";
const router = express.Router();
import multer from "multer";
import path from "path";

import {
  getAllBlogs,
  getMyBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogDetail
} from "../controllers/blogController";

import { authenticateToken, isAdmin } from "../middlewares/authMiddleware";

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, "uploads/blogs");
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to filename to avoid conflicts
  },
});

const upload = multer({
  storage,
  limits: { fieldSize: 1024 * 1024 * 1024, fileSize: 1024 * 1024 * 1024 },
});

router.post(
  "/",
  upload.fields([{ name: "featuredImage", maxCount: 1 }]),
  isAdmin,
  createBlog
);

router.get("/", isAdmin, getAllBlogs);
router.get("/mine", isAdmin, getMyBlogs);
router.put(
  "/:id",
  isAdmin,
  upload.fields([{ name: "featuredImage", maxCount: 1 }]),
  updateBlog
);
router.get('/:id', getBlogDetail);
router.delete("/:id", deleteBlog);

export default router;
