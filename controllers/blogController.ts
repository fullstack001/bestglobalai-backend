import { Request, Response } from "express";
import Blog from "../models/Blog";
import fs from "fs";
import path from "path";
interface MulterFile {
  filename: string;
}

const deleteFile = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export const createBlog = async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    const userId = req.user._id;
    const featuredImage = (req.files as { [fieldname: string]: MulterFile[] })[
      "featuredImage"
    ]
      ? `/uploads/blogs/${
          (req.files as { [fieldname: string]: MulterFile[] })[
            "featuredImage"
          ][0].filename
        }`
      : null;

    const newBlog = new Blog({
      title,
      content,
      featuredImage,
      userId,
    });

    await newBlog.save();
    res
      .status(201)
      .json({ message: "Book created successfully!", blog: newBlog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create blog." });
  }
};

export const getBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ blogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch blogs." });
  }
};

export const getMyBlogs = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    // const books = await Book.find();
    const blogs = await Blog.find({ userId })
      .populate("userId")
      .sort({ createdAt: -1 });
    res.status(200).json({ blogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch blogs." });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { title, content } = req.body;
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    blog.title = title || blog.title;
    blog.content = title || blog.content;

    // Handle cover image replacement
    if (req.files && (req.files as any)["featuredImage"]) {
      const featuredImage = (
        req.files as { [fieldname: string]: MulterFile[] }
      )["featuredImage"]
        ? `/uploads/blogs/${
            (req.files as { [fieldname: string]: MulterFile[] })[
              "featuredImage"
            ][0].filename
          }`
        : null;

      if (featuredImage) {
        // Delete the old cover image if a new one is provided
        if (blog.featuredImage) {
          const oldFeaturedImage = path.join(
            __dirname,
            `../uploads/blogs/${blog.featuredImage}`
          );
          deleteFile(oldFeaturedImage);
        }
        blog.featuredImage = featuredImage;
      }
    }

    await blog.save();
    res.status(200).json({ message: "Blog updated successfully!", blog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update blog." });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const featuredImage = blog.featuredImage
      ? path.join(__dirname, `../${blog.featuredImage}`)
      : null;
    if (featuredImage) deleteFile(featuredImage);

    await Blog.deleteOne({ _id: blogId });
    res
      .status(200)
      .json({ message: "Blog and associated files deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete blog." });
  }
};

export const getBlogDetail = async (req: Request, res: Response) => {
  try {
    const blogId = req.params.id;
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json({ blog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to retrieve blog content." });
  }
};

export const getLatestBlogs = async (req: Request, res: Response) => {
  const limit =
    typeof req.query.limit === "string" ? parseInt(req.query.limit) : 3;
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 }).limit(limit);
    res.status(200).json({ blogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch blogs." });
  }
};

export const getAllBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ blogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch blogs." });
  }
};


export const getBlogsPaginated = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10 } = req.query;
  
      // Calculate skip and limit for pagination
      const skip = (Number(page) - 1) * Number(limit);
  
      // Fetch blogs with pagination
      const blogs = await Blog.find()
        .sort({ createdAt: -1 }) // Order by most recent
        .skip(skip)
        .limit(Number(limit));
  
      // Count total number of blogs
      const totalBlogs = await Blog.countDocuments();
  
      res.status(200).json({
        blogs,
        totalBlogs,
        currentPage: Number(page),
        totalPages: Math.ceil(totalBlogs / Number(limit)),
      });
    } catch (error) {
      console.error("Error fetching paginated blogs:", error);
      res.status(500).json({ message: "Failed to fetch blogs." });
    }
  };

