const { body } = require("express-validator");

const createCreatorValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del autor o creador es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  body("tipo")
    .optional()
    .isString()
    .withMessage("El tipo debe ser texto"),

  body("descripcion")
    .optional()
    .isString()
    .withMessage("La descripción debe ser texto"),

  body("paisOrigen")
    .optional()
    .isString()
    .withMessage("El país u origen debe ser texto")
];

const updateCreatorValidator = createCreatorValidator;

module.exports = {
  createCreatorValidator,
  updateCreatorValidator
};