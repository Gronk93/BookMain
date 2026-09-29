import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import userRouter from "./user";
import booksRouter from "./books";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(userRouter);
router.use(booksRouter);

export default router;
