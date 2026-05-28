const { body } = require("express-validator");

const addToCartValidator = [
  body("producto")
    .notEmpty()
    .withMessage("El producto es obligatorio")
    .isMongoId()
    .withMessage("El producto debe ser un ID válido"),

  body("cantidad")
    .optional()
    .isInt({ min: 1 })
    .withMessage("La cantidad debe ser mayor o igual a 1")
];

const updateCartItemValidator = [
  body("producto")
    .notEmpty()
    .withMessage("El producto es obligatorio")
    .isMongoId()
    .withMessage("El producto debe ser un ID válido"),

  body("cantidad")
    .notEmpty()
    .withMessage("La cantidad es obligatoria")
    .isInt({ min: 1 })
    .withMessage("La cantidad debe ser mayor o igual a 1")
];

const removeCartItemValidator = [
  body("producto")
    .notEmpty()
    .withMessage("El producto es obligatorio")
    .isMongoId()
    .withMessage("El producto debe ser un ID válido")
];

module.exports = {
  addToCartValidator,
  updateCartItemValidator,
  removeCartItemValidator
};