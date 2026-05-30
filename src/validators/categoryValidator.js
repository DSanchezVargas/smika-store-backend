const { body } = require("express-validator");

const optionalText = (field, message) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage(message);

const optionalBoolean = (field, message) =>
  body(field)
    .optional()
    .isBoolean()
    .withMessage(message);

const optionalNumber = (field, message) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isNumeric()
    .withMessage(message);

const optionalMongoId = (field, message) =>
  body(field)
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage(message);

const createCategoryValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre de la categoría es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  optionalText("descripcion", "La descripción debe ser texto"),

  body("tipo")
    .optional()
    .isIn(["principal", "subcategoria"])
    .withMessage("El tipo debe ser principal o subcategoria"),

  optionalMongoId("categoriaPadre", "La categoría padre debe ser un ID válido"),

  optionalText("imagen", "La imagen debe ser una URL o texto válido"),
  optionalNumber("orden", "El orden debe ser numérico"),
  optionalBoolean("activa", "El campo activa debe ser verdadero o falso")
];

const updateCategoryValidator = [
  body("nombre")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  optionalText("descripcion", "La descripción debe ser texto"),

  body("tipo")
    .optional()
    .isIn(["principal", "subcategoria"])
    .withMessage("El tipo debe ser principal o subcategoria"),

  optionalMongoId("categoriaPadre", "La categoría padre debe ser un ID válido"),

  optionalText("imagen", "La imagen debe ser una URL o texto válido"),
  optionalNumber("orden", "El orden debe ser numérico"),
  optionalBoolean("activa", "El campo activa debe ser verdadero o falso")
];

module.exports = {
  createCategoryValidator,
  updateCategoryValidator
};