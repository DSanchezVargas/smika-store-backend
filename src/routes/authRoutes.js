const express = require("express");

const {
  register,
  login,
  profile
} = require("../controllers/authController");

const {
  registerValidator,
  loginValidator
} = require("../validators/authValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post(
  "/register",
  registerValidator,
  validateFields,
  register
);

router.post(
  "/login",
  loginValidator,
  validateFields,
  login
);

router.get(
  "/profile",
  protect,
  profile
);

module.exports = router;