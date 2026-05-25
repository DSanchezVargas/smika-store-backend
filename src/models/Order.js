const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "El producto es obligatorio"]
    },

    nombreProducto: {
      type: String,
      required: [true, "El nombre del producto es obligatorio"],
      trim: true
    },

    cantidad: {
      type: Number,
      required: [true, "La cantidad es obligatoria"],
      min: [1, "La cantidad mínima es 1"]
    },

    precioReferencialUnitario: {
      type: Number,
      required: [true, "El precio referencial unitario es obligatorio"],
      min: [0, "El precio no puede ser negativo"]
    },

    subtotalReferencial: {
      type: Number,
      required: [true, "El subtotal referencial es obligatorio"],
      min: [0, "El subtotal no puede ser negativo"]
    }
  },
  {
    _id: false
  }
);

const orderSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    cliente: {
      nombre: {
        type: String,
        trim: true,
        default: ""
      },

      apellido: {
        type: String,
        trim: true,
        default: ""
      },

      alias: {
        type: String,
        trim: true,
        default: ""
      },

      pais: {
        type: String,
        trim: true,
        default: "PE"
      },

      codigoPais: {
        type: String,
        trim: true,
        default: "+51"
      },

      telefono: {
        type: String,
        trim: true,
        default: ""
      },

      telefonoCompleto: {
        type: String,
        trim: true,
        default: ""
      },

      email: {
        type: String,
        trim: true,
        default: ""
      }
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message: "El pedido debe tener al menos un producto"
      }
    },

    totalReferencial: {
      type: Number,
      required: [true, "El total referencial es obligatorio"],
      min: [0, "El total no puede ser negativo"]
    },

    montoPagado: {
      type: Number,
      default: 0,
      min: [0, "El monto pagado no puede ser negativo"]
    },

    saldoPendiente: {
      type: Number,
      default: 0,
      min: [0, "El saldo pendiente no puede ser negativo"]
    },

    estadoPago: {
      type: String,
      enum: ["sin_pago", "adelanto", "pago_completo", "cuotas"],
      default: "sin_pago"
    },

    estadoPedido: {
      type: String,
      enum: [
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
      ],
      default: "pendiente_whatsapp"
    },

    whatsappLink: {
      type: String,
      default: ""
    },

    observaciones: {
      type: String,
      trim: true,
      default: ""
    },

    notasAdmin: {
      type: String,
      trim: true,
      default: ""
    },

    envio: {
      courier: {
        type: String,
        trim: true,
        default: ""
      },

      numeroTracking: {
        type: String,
        trim: true,
        default: ""
      },

      trackingUrl: {
        type: String,
        trim: true,
        default: ""
      },

      fechaEnvio: {
        type: Date,
        default: null
      },

      fechaEntregaEstimada: {
        type: Date,
        default: null
      },

      direccionEntrega: {
        type: String,
        trim: true,
        default: ""
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Order", orderSchema);