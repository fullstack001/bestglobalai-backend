import express, { Request, Response } from "express";
const router = express.Router();

import {
  createContact,
  getContactPaginated,
  getContactDetail
} from "../controllers/contactController";

import { isSuperAdmin } from "../middlewares/authMiddleware";

router.post("/", createContact);
router.get("/paginated", isSuperAdmin, getContactPaginated);
router.get("/:id", isSuperAdmin, getContactDetail);

export default router;
