const { body } = require("express-validator");

const createCharacterValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre del personaje es obligatorio")
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

  body("imagen")
    .optional()
    .isString()
    .withMessage("La imagen debe ser una ruta generada por el sistema"),

  body("serie")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("La serie debe ser un ID válido")
];

const updateCharacterValidator = createCharacterValidator;

module.exports = {
  createCharacterValidator,
  updateCharacterValidator
};