import { Router } from "express";
import verify from "../middleware/verify.js";
import path from "path";

const router = Router();
const publicDir = path.join(process.cwd(), "public");

router.get("/showpage", verify, async (req, res) => {
  res.sendFile(path.join(publicDir, "dashboard.html"));
});


export default router;
