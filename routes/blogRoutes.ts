import express, { Request, Response } from "express";
const router = express.Router();
import multer from "multer";
import path from "path";

import {
  getBlogs,
  getMyBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogDetail,
  getLatestBlogs,
  getAllBlogs,
  getBlogsPaginated
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

router.get("/", isAdmin, getBlogs);
router.get("/all", getAllBlogs);
router.get("/latest", getLatestBlogs);
router.get("/mine", isAdmin, getMyBlogs);
router.get("/paginated", getBlogsPaginated);
router.put(
  "/:id",
  isAdmin,
  upload.fields([{ name: "featuredImage", maxCount: 1 }]),
  updateBlog
);
router.get("/:id", getBlogDetail);
router.delete("/:id", deleteBlog);


export default router;
