const express = require("express");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} = require("../controllers/cartController");

const {
  getCartValidator,
  addToCartValidator,
  updateCartItemValidator,
  removeCartItemValidator,
  clearCartValidator
} = require("../validators/cartValidator");

const { validateFields } = require("../middlewares/validateMiddleware");

const router = express.Router();

router.get("/", getCartValidator, validateFields, getCart);

router.post(
  "/add",
  addToCartValidator,
  validateFields,
  addToCart
);

router.put(
  "/item",
  updateCartItemValidator,
  validateFields,
  updateCartItem
);

router.delete(
  "/item",
  removeCartItemValidator,
  validateFields,
  removeCartItem
);

router.delete(
  "/clear",
  clearCartValidator,
  validateFields,
  clearCart
);

module.exports = router;