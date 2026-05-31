const express = require("express");

const {
  getCreators,
  getCreatorById,
  createCreator,
  updateCreator,
  deleteCreator
} = require("../controllers/creatorController");

const {
  createCreatorValidator,
  updateCreatorValidator
} = require("../validators/creatorValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getCreators);
router.get("/:id", getCreatorById);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "subadmin"),
  createCreatorValidator,
  validateFields,
  createCreator
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  updateCreatorValidator,
  validateFields,
  updateCreator
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  deleteCreator
);

module.exports = router;