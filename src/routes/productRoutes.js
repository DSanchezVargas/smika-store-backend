const express = require("express");

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");

const {
  createProductValidator,
  updateProductValidator
} = require("../validators/productValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProductById);

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createProductValidator,
  validateFields,
  createProduct
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  updateProductValidator,
  validateFields,
  updateProduct
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  deleteProduct
);

module.exports = router;