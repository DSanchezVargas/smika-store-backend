const { body } = require("express-validator");
const { onlyNumbers, isValidPeruPhone } = require("../utils/phoneHelper");

const clienteValidator = [
  body("cliente.nombre")
    .notEmpty()
    .withMessage("El nombre del cliente es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El nombre del cliente debe tener al menos 2 caracteres"),

  body("cliente.apellido")
    .notEmpty()
    .withMessage("El apellido del cliente es obligatorio")
    .isLength({ min: 2 })
    .withMessage("El apellido del cliente debe tener al menos 2 caracteres"),

  body("cliente.alias")
    .optional()
    .isString()
    .withMessage("El alias debe ser texto"),

  body("cliente.pais")
    .optional()
    .isString()
    .withMessage("El país debe ser texto"),

  body("cliente.codigoPais")
    .optional()
    .isString()
    .withMessage("El código de país debe ser texto"),

  body("cliente.telefono")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      const pais = req.body.cliente?.pais || "PE";
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

  body("cliente.email")
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage("El correo debe tener un formato válido")
];

const createOrderFromCartValidator = [
  body("sessionId")
    .notEmpty()
    .withMessage("El sessionId es obligatorio"),

  body("usuario")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("El usuario debe ser un ID válido"),

  ...clienteValidator,

  body("montoPagado")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El monto pagado no puede ser negativo"),

  body("estadoPago")
    .optional()
    .isIn(["sin_pago", "adelanto", "pago_completo", "cuotas"])
    .withMessage("El estado de pago no es válido"),

  body("observaciones")
    .optional()
    .isString()
    .withMessage("Las observaciones deben ser texto")
];

const createOrderDirectValidator = [
  body("usuario")
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage("El usuario debe ser un ID válido"),

  ...clienteValidator,

  body("items")
    .isArray({ min: 1 })
    .withMessage("El pedido debe tener al menos un producto"),

  body("items.*.producto")
    .notEmpty()
    .withMessage("Cada item debe tener un producto")
    .isMongoId()
    .withMessage("Cada producto debe ser un ID válido"),

  body("items.*.cantidad")
    .optional()
    .isInt({ min: 1 })
    .withMessage("La cantidad debe ser mayor o igual a 1"),

  body("montoPagado")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El monto pagado no puede ser negativo"),

  body("estadoPago")
    .optional()
    .isIn(["sin_pago", "adelanto", "pago_completo", "cuotas"])
    .withMessage("El estado de pago no es válido"),

  body("observaciones")
    .optional()
    .isString()
    .withMessage("Las observaciones deben ser texto")
];

const updateOrderStatusValidator = [
  body("montoPagado")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El monto pagado no puede ser negativo"),

  body("estadoPago")
    .optional()
    .isIn(["sin_pago", "adelanto", "pago_completo", "cuotas"])
    .withMessage("El estado de pago no es válido"),

  body("estadoPedido")
    .optional()
    .isIn([
      "pendiente_whatsapp",
      "cotizado",
      "separado",
      "confirmado",
      "en_preparacion",
      "empaquetado",
      "listo_para_entrega",
      "enviado",
      "en_courier",
      "entregado",
      "cancelado"
    ])
    .withMessage("El estado del pedido no es válido"),

  body("observaciones")
    .optional()
    .isString()
    .withMessage("Las observaciones deben ser texto"),

  body("notasAdmin")
    .optional()
    .isString()
    .withMessage("Las notas del administrador deben ser texto"),

  body("envio.courier")
    .optional()
    .isString()
    .withMessage("El courier debe ser texto"),

  body("envio.numeroTracking")
    .optional()
    .isString()
    .withMessage("El número de tracking debe ser texto"),

  body("envio.trackingUrl")
    .optional()
    .isString()
    .withMessage("El enlace de tracking debe ser texto"),

  body("envio.fechaEnvio")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("La fecha de envío debe tener un formato válido"),

  body("envio.fechaEntregaEstimada")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage("La fecha estimada de entrega debe tener un formato válido"),

  body("envio.direccionEntrega")
    .optional()
    .isString()
    .withMessage("La dirección de entrega debe ser texto")
];

module.exports = {
  createOrderFromCartValidator,
  createOrderDirectValidator,
  updateOrderStatusValidator
};