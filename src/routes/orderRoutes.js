const express = require("express");

const {
  createOrderFromCart,
  createOrderDirect,
  getOrders,
  getOrderById,
  getMyOrders,
  updateOrderStatus
} = require("../controllers/orderController");

const {
  createOrderFromCartValidator,
  createOrderDirectValidator,
  updateOrderStatusValidator
} = require("../validators/orderValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.post(
  "/from-cart",
  createOrderFromCartValidator,
  validateFields,
  createOrderFromCart
);

router.post(
  "/direct",
  createOrderDirectValidator,
  validateFields,
  createOrderDirect
);

router.get(
  "/me",
  protect,
  getMyOrders
);

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  getOrders
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin"),
  getOrderById
);

router.patch(
  "/:id/status",
  protect,
  authorizeRoles("admin"),
  updateOrderStatusValidator,
  validateFields,
  updateOrderStatus
);

module.exports = router;