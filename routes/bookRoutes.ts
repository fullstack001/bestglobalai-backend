import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import {
  createBook,
  getMyBooks,
  getEbookContent,
  getBookDetails,
  updateBook,
  downloadEbook,
  deleteBook,
  getAllBooks,
  ebookUpload,
  makePublic,
  getPublicBooks
} from "../controllers/BooKController";
import {authenticateToken} from "../middlewares/authMiddleware";


const router = express.Router();

// Multer setup for file uploads (coverImage, audioFiles, videoFiles)
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, "uploads/");
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to filename to avoid conflicts
  },
});

const upload = multer({ storage , limits: { fileSize: 50 * 1024 * 1024 }, });

// Route to handle book creation
router.post(
  "/",
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "audioFiles", maxCount: 10 },
    { name: "videoFiles", maxCount: 10 },
  ]),
  authenticateToken,
  createBook
);

router.get("/", authenticateToken, getAllBooks);
router.get("/mine", authenticateToken, getMyBooks);
router.get("/:id/content", getEbookContent);
router.get("/:id", getBookDetails);

router.get("/:id/download", downloadEbook);
router.delete("/:id", deleteBook);


router.put('/:id', upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'audioFiles', maxCount: 10 },
  { name: 'videoFiles', maxCount: 10 },
]), updateBook);

router.post(
  "/ebookUpload",
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "bookFile", maxCount: 1 },
  ]),
  authenticateToken,
  ebookUpload
);


router.put("/:id/make-public", authenticateToken, makePublic);
router.get("/getPublicBooks", authenticateToken, getPublicBooks);

export default router;
