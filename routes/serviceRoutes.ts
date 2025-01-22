import express from "express";

import {
    createServiceOrder,
    getServieOrderPaginated,
    getServiceOrderDetail
} from "../controllers/serviceController";

const router = express.Router();

import { isSuperAdmin } from "../middlewares/authMiddleware";

router.post("/", createServiceOrder);
router.get("/paginated", isSuperAdmin, getServieOrderPaginated);
router.get("/:id", isSuperAdmin, getServiceOrderDetail);

export default router;
