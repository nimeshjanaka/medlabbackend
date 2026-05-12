import { Router } from "express";
import { labTestController } from "../controllers/labtest.controller";
import { authMiddleware, adminOnly } from "../middleware/auth.middleware";

export const labTestRoutes = Router();

labTestRoutes.use(authMiddleware);

// Anyone authenticated can read
labTestRoutes.get("/",           labTestController.getAll);
labTestRoutes.get("/categories", labTestController.getCategories);
labTestRoutes.get("/:id",        labTestController.getById);

// Admin only: create / update / deactivate / seed
labTestRoutes.post("/seed",   adminOnly, labTestController.seed);
labTestRoutes.post("/",       adminOnly, labTestController.create);
labTestRoutes.put("/:id",     adminOnly, labTestController.update);
labTestRoutes.delete("/:id",  adminOnly, labTestController.deactivate);
