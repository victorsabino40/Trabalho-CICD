import ProductController from "@/controllers/product-controller";
import prismaClient from "@/database";
import { Router } from "express";

const router = Router();

const productController = new ProductController(prismaClient);

router.get("/dashboard", productController.dashboard);
router.get("/", productController.index);
router.get("/:id", productController.view);
router.post("/", productController.store);
router.patch("/:id", productController.update);
router.delete("/:id", productController.destroy);

export default router;
