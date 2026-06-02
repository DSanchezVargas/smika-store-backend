const mongoose = require("mongoose");
const cartItemSchema = new mongoose.Schema(
  {
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "El producto es obligatorio"]
    },

    cantidad: {
      type: Number,
      required: [true, "La cantidad es obligatoria"],
      min: [1, "La cantidad mínima es 1"],
      default: 1
    },

    precioReferencialUnitario: {
      type: Number,
      required: [true, "El precio referencial unitario es obligatorio"],
      min: [0, "El precio no puede ser negativo"]
    },

    varianteCodigo: {
      type: String,
      trim: true,
      default: ""
    },

    varianteNombre: {
      type: String,
      trim: true,
      default: ""
    },

    variantePrecioReferencial: {
      type: Number,
      default: 0,
      min: [0, "El precio de la opción no puede ser negativo"]
    }
  },
  {
    _id: false
  }
);

const cartSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    sessionId: {
      type: String,
      trim: true,
      default: ""
    },

    items: {
      type: [cartItemSchema],
      default: []
    },

    totalReferencial: {
      type: Number,
      default: 0,
      min: [0, "El total no puede ser negativo"]
    },

    estado: {
      type: String,
      enum: ["activo", "convertido_en_pedido", "abandonado"],
      default: "activo"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Cart", cartSchema);