const { body, query } = require("express-validator");

const getCartValidator = [
  query("sessionId")
    .notEmpty()
    .withMessage("El sessionId es obligatorio")
];

const addToCartValidator = [
  body("sessionId")
    .notEmpty()
    .withMessage("El sessionId es obligatorio"),

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
  body("sessionId")
    .notEmpty()
    .withMessage("El sessionId es obligatorio"),

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
  body("sessionId")
    .notEmpty()
    .withMessage("El sessionId es obligatorio"),

  body("producto")
    .notEmpty()
    .withMessage("El producto es obligatorio")
    .isMongoId()
    .withMessage("El producto debe ser un ID válido")
];

const clearCartValidator = [
  body("sessionId")
    .notEmpty()
    .withMessage("El sessionId es obligatorio")
];

module.exports = {
  getCartValidator,
  addToCartValidator,
  updateCartItemValidator,
  removeCartItemValidator,
  clearCartValidator
};