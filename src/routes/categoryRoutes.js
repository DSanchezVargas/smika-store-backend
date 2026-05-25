const express = require("express");

const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");

const {
  createCategoryValidator,
  updateCategoryValidator
} = require("../validators/categoryValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createCategoryValidator,
  validateFields,
  createCategory
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  updateCategoryValidator,
  validateFields,
  updateCategory
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteCategory
);

module.exports = router;