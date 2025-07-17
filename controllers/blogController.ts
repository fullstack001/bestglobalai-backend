import { Request, Response } from "express";
import slugify from "slugify";
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
    const slug = slugify(title, { lower: true, strict: true });
    const existing = await Blog.findOne({ name: slug });
    if (existing) {
      return res.status(400).json({
        message: "A blog with a similar title already exists. Please modify the title.",
      });
    }
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
      name: slug,
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
    for (const blog of blogs) {
      if (!blog.name) {
        let baseSlug = slugify(blog.title, { lower: true, strict: true });
        let slug = baseSlug;
        let counter = 1;
       
        while (await Blog.findOne({ name: slug })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        blog.name = slug;
        await blog.save();
      }
    }
    res.status(200).json({ blogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch blogs." });
  }
};

export const getMyBlogs = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;  
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
    const blogName = req.params.name;
    const blog = await Blog.findOne({ name: blogName });
    const { title, content } = req.body; 
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }   
    blog.title = title || blog.title;
    blog.content = content || blog.content;
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
    const blogName = req.params.name;
    const blog = await Blog.findOne({ name: blogName });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }   
    const featuredImage = blog.featuredImage
      ? path.join(__dirname, `../${blog.featuredImage}`)
      : null;
    if (featuredImage) deleteFile(featuredImage);

    // Delete the blog document
    const blogId = blog._id;
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
    const blogName = req.params.name;
    const blog = await Blog.findOne({ name: blogName });
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
    for (const blog of blogs) {
      if (!blog.name) {
        let baseSlug = slugify(blog.title, { lower: true, strict: true });
        let slug = baseSlug;
        let counter = 1;

        // Ensure the slug is unique
        while (await Blog.findOne({ name: slug })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        blog.name = slug;
        await blog.save();
      }
    }
    res.status(200).json({ blogs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch blogs." });
  }
};


export const getBlogsPaginated = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10 } = req.query;  
      const skip = (Number(page) - 1) * Number(limit);  
      const blogs = await Blog.find()
        .sort({ createdAt: -1 }) 
        .skip(skip)
        .limit(Number(limit));  
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

