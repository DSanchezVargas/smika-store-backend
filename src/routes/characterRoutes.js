const express = require("express");

const {
  getCharacters,
  getCharacterById,
  createCharacter,
  updateCharacter,
  deleteCharacter
} = require("../controllers/characterController");

const {
  createCharacterValidator,
  updateCharacterValidator
} = require("../validators/characterValidator");

const { validateFields } = require("../middlewares/validateMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const router = express.Router();

router.get("/", getCharacters);
router.get("/:id", getCharacterById);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "subadmin"),
  createCharacterValidator,
  validateFields,
  createCharacter
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  updateCharacterValidator,
  validateFields,
  updateCharacter
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "subadmin"),
  deleteCharacter
);

module.exports = router;