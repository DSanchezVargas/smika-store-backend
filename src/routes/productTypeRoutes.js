const express = require("express");

const {
  getProductTypes,
  getProductTypeById,
  createProductType,
  updateProductType,
  deleteProductType
} = require("../controllers/productTypeController");

const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getProductTypes);
router.get("/:id", getProductTypeById);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "subadmin"),
  createProductType
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  updateProductType
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  deleteProductType
);

module.exports = router;