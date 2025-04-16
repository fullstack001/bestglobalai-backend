import express, { Request, Response } from "express";
const router = express.Router();

import {
  createContact,
  getContactPaginated,
  getContactDetail,
  deleteContactDetail,
  replyContact,
} from "../controllers/contactController";

import { isSuperAdmin } from "../middlewares/authMiddleware";

router.post("/", createContact);
router.get("/paginated", isSuperAdmin, getContactPaginated);
router.get("/:id", isSuperAdmin, getContactDetail);
router.delete("/:id", isSuperAdmin, deleteContactDetail);
router.post("/reply/:id", isSuperAdmin, replyContact);

export default router;
