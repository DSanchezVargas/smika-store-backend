const express = require("express");

const {
  getMyRecommendations
} = require("../controllers/recommendationController");

const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/me", protect, getMyRecommendations);

module.exports = router;