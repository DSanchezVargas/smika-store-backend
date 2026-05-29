const { body, param } = require("express-validator");
const { onlyNumbers, isValidPeruPhone } = require("../utils/phoneHelper");

const VALID_ROLES = ["cliente", "admin", "subadmin"];

const userIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("El usuario debe ser un ID válido")
];

const phoneValidator = body("telefono")
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
  });

const createSubadminValidator = [
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
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("El alias debe ser texto"),

  body("email")
    .notEmpty()
    .withMessage("El correo es obligatorio")
    .isEmail()
    .withMessage("Debe ingresar un correo válido"),

  body("password")
    .notEmpty()
    .withMessage("La contraseña es obligatoria")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),

  body("pais")
    .optional()
    .isString()
    .withMessage("El país debe ser texto"),

  body("codigoPais")
    .optional()
    .isString()
    .withMessage("El código de país debe ser texto"),

  phoneValidator,

  body("activo")
    .optional()
    .isBoolean()
    .withMessage("El campo activo debe ser verdadero o falso")
];

const updateUserRoleValidator = [
  ...userIdValidator,

  body("role")
    .notEmpty()
    .withMessage("El rol es obligatorio")
    .isIn(VALID_ROLES)
    .withMessage("El rol debe ser cliente, admin o subadmin")
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
    .optional({ nullable: true, checkFalsy: true })
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

  phoneValidator,

  body("email")
    .optional()
    .isEmail()
    .withMessage("Debe ingresar un correo válido"),

  body("password")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),

  body("activo")
    .optional()
    .isBoolean()
    .withMessage("El campo activo debe ser verdadero o falso")
];

module.exports = {
  userIdValidator,
  createSubadminValidator,
  updateUserRoleValidator,
  updateUserDataValidator
};