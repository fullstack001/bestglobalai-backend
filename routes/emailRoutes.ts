import express from "express";

import {
    sendEmailServices
} from "../controllers/emailController";

const router = express.Router();

router.post("/services", sendEmailServices);

export default router;
