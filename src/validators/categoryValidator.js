const { body } = require("express-validator");

const createCategoryValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre de la categoría es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  body("descripcion")
    .optional()
    .isString()
    .withMessage("La descripción debe ser texto"),

  body("tipo")
    .optional()
    .isIn(["principal", "subcategoria"])
    .withMessage("El tipo debe ser principal o subcategoria"),

  body("categoriaPadre")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("La categoría padre debe ser un ID válido"),

  body("imagen")
    .optional()
    .isString()
    .withMessage("La imagen debe ser una URL o texto válido"),

  body("orden")
    .optional()
    .isNumeric()
    .withMessage("El orden debe ser numérico")
];

const updateCategoryValidator = createCategoryValidator;

module.exports = {
  createCategoryValidator,
  updateCategoryValidator
};