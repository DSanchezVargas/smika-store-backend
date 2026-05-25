const express = require("express");

const {
  getMyPreferences,
  toggleFavoriteSeries,
  toggleFavoriteCategory,
  toggleFavoriteProduct,
  toggleWishlistProduct,
  updateNotificationPreference
} = require("../controllers/preferenceController");

const {
  toggleSeriesValidator,
  toggleCategoryValidator,
  toggleProductValidator,
  updateNotificationPreferenceValidator
} = require("../validators/preferenceValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/me", protect, getMyPreferences);

router.patch(
  "/series/:serieId/toggle",
  protect,
  toggleSeriesValidator,
  validateFields,
  toggleFavoriteSeries
);

router.patch(
  "/categories/:categoryId/toggle",
  protect,
  toggleCategoryValidator,
  validateFields,
  toggleFavoriteCategory
);

router.patch(
  "/products/:productId/favorite/toggle",
  protect,
  toggleProductValidator,
  validateFields,
  toggleFavoriteProduct
);

router.patch(
  "/wishlist/:productId/toggle",
  protect,
  toggleProductValidator,
  validateFields,
  toggleWishlistProduct
);

router.patch(
  "/notifications",
  protect,
  updateNotificationPreferenceValidator,
  validateFields,
  updateNotificationPreference
);

module.exports = router;