const express = require("express");

const {
  getProducts,
  getProductImage,
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
router.get("/:id/image/:index", getProductImage);
router.get("/:id", getProductById);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "subadmin"),
  createProductValidator,
  validateFields,
  createProduct
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  updateProductValidator,
  validateFields,
  updateProduct
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  deleteProduct
);

module.exports = router;
