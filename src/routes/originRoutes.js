const express = require("express");

const {
  getOrigins,
  getOriginById,
  createOrigin,
  updateOrigin,
  deleteOrigin
} = require("../controllers/originController");

const {
  createOriginValidator,
  updateOriginValidator
} = require("../validators/originValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getOrigins);
router.get("/:id", getOriginById);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "subadmin"),
  createOriginValidator,
  validateFields,
  createOrigin
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  updateOriginValidator,
  validateFields,
  updateOrigin
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  deleteOrigin
);

module.exports = router;