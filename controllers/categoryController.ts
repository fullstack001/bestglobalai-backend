import Category from "../models/Category";
import Follower from "../models/Follower";
import User from "../models/User";
import { Request, Response } from "express";

export const getCategories = async (req: Request, res: Response) => {
  const userId = req.user._id;
  try{
    const user = await User.findById(userId);
    if (!user || (!["superAdmin", "admin", "editor"].includes(user.role)) || !user.isActive) {
      return res
        .status(403)
        .json({ message: "Only paid users can generate invites." });
    }else{
      const categories = await Category.find({ user: userId });
      if (!categories || categories.length === 0) {
        return res.status(404).json({ message: "No categories found." });
      }
      res.json(categories);
    }    
  }catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
 
};

export const createCategory = async (req: Request, res: Response) => {
  const { name } = req.body;
  const userId = req.user._id;
  try{
    const user = await User.findById(userId);
    if (!user || (!["superAdmin", "admin", "editor"].includes(user.role)) || !user.isActive) {
      return res
        .status(403)
        .json({ message: "Only paid users can generate invites." });
    }else{
      const existing = await Category.findOne({ user: userId, name });
      if (existing) return res.status(400).json({ message: "Category exists." });

      const category = await Category.create({ name, user: userId });
      res.json(category);
    }    
  }catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const { name } = req.body;
  const { id } = req.params;

  const updated = await Category.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { name },
    { new: true }
  );
  res.json(updated);
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user._id;
  try{
    const user = await User.findById(userId);
    if (!user || (!["superAdmin", "admin", "editor"].includes(user.role)) || !user.isActive) {
      return res
        .status(403)
        .json({ message: "Only paid users can generate invites." });
    }else{
      const category = await Category.findOne({ _id: id, user: userId });
      if (!category) return res.status(404).json({ message: "Category not found." });

      if (category.isDefault)
        return res.status(400).json({ message: "Cannot delete default category." });

      const defaultCategory = await Category.findOne({ user: userId, isDefault: true });
      if (!defaultCategory)
        return res.status(500).json({ message: "Default category missing." });

      await Follower.updateMany({ category: id }, { category: defaultCategory._id });
      await category.deleteOne();
      res.json({ message: "Category deleted and reassigned." });
    }    
  }catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
