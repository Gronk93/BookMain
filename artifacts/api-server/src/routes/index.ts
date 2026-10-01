import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import userRouter from "./user";
import booksRouter from "./books";
import highlightsRouter from "./highlights";
import separatorsRouter from "./separators";
import notesRouter from "./notes";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(userRouter);
router.use(booksRouter);
router.use(highlightsRouter);
router.use(separatorsRouter);
router.use(notesRouter);

export default router;
