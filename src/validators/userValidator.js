const { body, param } = require("express-validator");
const { onlyNumbers, isValidPeruPhone } = require("../utils/phoneHelper");

const userIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("El usuario debe ser un ID válido")
];

const updateUserRoleValidator = [
  ...userIdValidator,

  body("role")
    .notEmpty()
    .withMessage("El rol es obligatorio")
    .isIn(["cliente", "admin"])
    .withMessage("El rol debe ser cliente o admin")
];

const updateUserDataValidator = [
  ...userIdValidator,

  body("nombre")
    .optional()
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  body("apellido")
    .optional()
    .isLength({ min: 2 })
    .withMessage("El apellido debe tener al menos 2 caracteres"),

  body("alias")
    .optional()
    .isString()
    .withMessage("El alias debe ser texto"),

  body("pais")
    .optional()
    .isString()
    .withMessage("El país debe ser texto"),

  body("codigoPais")
    .optional()
    .isString()
    .withMessage("El código de país debe ser texto"),

  body("telefono")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      const pais = req.body.pais || "PE";
      const cleanPhone = onlyNumbers(value);

      if (!cleanPhone) {
        return true;
      }

      if (pais === "PE" && !isValidPeruPhone(cleanPhone)) {
        throw new Error(
          "El teléfono peruano debe empezar con 9 y tener 9 dígitos"
        );
      }

      return true;
    }),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Debe ingresar un correo válido"),

  body("activo")
    .optional()
    .isBoolean()
    .withMessage("El campo activo debe ser verdadero o falso")
];

module.exports = {
  userIdValidator,
  updateUserRoleValidator,
  updateUserDataValidator
};