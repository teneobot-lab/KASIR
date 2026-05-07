import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import suppliersRouter from "./suppliers";
import productsRouter from "./products";
import inventoryRouter from "./inventory";
import customersRouter from "./customers";
import shiftsRouter from "./shifts";
import transactionsRouter from "./transactions";
import reportsRouter from "./reports";
import discountsRouter from "./discounts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(suppliersRouter);
router.use(productsRouter);
router.use(inventoryRouter);
router.use(customersRouter);
router.use(shiftsRouter);
router.use(transactionsRouter);
router.use(reportsRouter);
router.use(discountsRouter);

export default router;
