import express from "express";

import {translateBookProcess, translateVideoScriptProcess} from "../controllers/translateController";

const router = express.Router();
router.post('/eBook', translateBookProcess);
router.post('/video-script', translateVideoScriptProcess);
export default router;