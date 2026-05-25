const { body } = require("express-validator");
const { onlyNumbers, isValidPeruPhone } = require("../utils/phoneHelper");

const registerValidator = [
  body("nombre")
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El nombre debe tener al menos 2 caracteres"),

  body("apellido")
    .notEmpty()
    .withMessage("El apellido es obligatorio")
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
    .notEmpty()
    .withMessage("El correo es obligatorio")
    .isEmail()
    .withMessage("Debe ingresar un correo válido"),

  body("password")
    .notEmpty()
    .withMessage("La contraseña es obligatoria")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres")
];

const loginValidator = [
  body("email")
    .notEmpty()
    .withMessage("El correo es obligatorio")
    .isEmail()
    .withMessage("Debe ingresar un correo válido"),

  body("password")
    .notEmpty()
    .withMessage("La contraseña es obligatoria")
];

module.exports = {
  registerValidator,
  loginValidator
};