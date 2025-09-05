import ProductController from "@/controllers/product-controller";
import { Router } from "express";

const router = Router();

router.get("/", ProductController.index);
router.get("/:id", ProductController.view);
router.post("/", ProductController.store);
router.patch("/:id", ProductController.update);
router.delete("/:id", ProductController.destroy);

export default router;
