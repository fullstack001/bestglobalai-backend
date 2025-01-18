import express from "express";

import {translateBookProcess} from "../controllers/translateController";

const router = express.Router();
router.post('/eBook', translateBookProcess);

export default router;