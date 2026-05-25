const { body } = require("express-validator");

const createEventValidator = [
  body("titulo")
    .notEmpty()
    .withMessage("El título del evento es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El título debe tener al menos 2 caracteres"),

  body("descripcion")
    .notEmpty()
    .withMessage("La descripción del evento es obligatoria"),

  body("imagen")
    .optional()
    .isString()
    .withMessage("La imagen debe ser una ruta generada por el sistema"),

  body("tipoEvento")
    .optional()
    .isString()
    .withMessage("El tipo de evento debe ser texto"),

  body("pais")
    .optional()
    .isString()
    .withMessage("El país u origen debe ser texto"),

  body("serie")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("La serie debe ser un ID válido"),

  body("fechaInicio")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("La fecha de inicio debe tener un formato válido"),

  body("fechaFin")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("La fecha de fin debe tener un formato válido"),

  body("estado")
    .optional()
    .isIn(["proximo", "activo", "finalizado", "cancelado"])
    .withMessage("El estado del evento no es válido"),

  body("destacado")
    .optional()
    .isBoolean()
    .withMessage("El campo destacado debe ser verdadero o falso")
];

const updateEventValidator = createEventValidator;

module.exports = {
  createEventValidator,
  updateEventValidator
};