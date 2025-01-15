import express from "express";

import {translateProcess} from "../controllers/translateController";

const router = express.Router();
router.post('/', translateProcess);

export default router;