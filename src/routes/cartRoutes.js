const express = require("express");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  buildWhatsAppMessage
} = require("../controllers/cartController");

const {
  addToCartValidator,
  updateCartItemValidator,
  removeCartItemValidator
} = require("../validators/cartValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protect, getCart);

router.post(
  "/add",
  protect,
  addToCartValidator,
  validateFields,
  addToCart
);

router.put(
  "/item",
  protect,
  updateCartItemValidator,
  validateFields,
  updateCartItem
);

router.delete(
  "/item",
  protect,
  removeCartItemValidator,
  validateFields,
  removeCartItem
);

router.delete(
  "/clear",
  protect,
  clearCart
);

router.post(
  "/whatsapp",
  protect,
  buildWhatsAppMessage
);

module.exports = router;