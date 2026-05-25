const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del producto es obligatorio"],
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    descripcion: {
      type: String,
      required: [true, "La descripción del producto es obligatoria"],
      trim: true
    },

    precioReferencial: {
      type: Number,
      required: [true, "El precio referencial es obligatorio"],
      min: [0, "El precio no puede ser negativo"]
    },

    precioAnterior: {
      type: Number,
      default: null
    },

    imagenes: {
      type: [String],
      default: []
    },

    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "La categoría es obligatoria"]
    },

    subcategoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },

    serie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      required: [true, "La serie del producto es obligatoria"]
    },

    evento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null
    },

    origen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Origin",
      required: [true, "El país u origen del producto es obligatorio"]
    },

    personajes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Character"
      }
    ],

    marca: {
      type: String,
      trim: true,
      default: "Sin marca"
    },

    tipoProducto: {
      type: String,
      required: [true, "El tipo de producto es obligatorio"],
      trim: true
    },

    disponibilidad: {
      type: String,
      enum: ["stock", "preventa", "por_pedido", "agotado"],
      default: "stock"
    },

    stock: {
      type: Number,
      default: 0,
      min: [0, "El stock no puede ser negativo"]
    },

    tiempoEstimado: {
      type: String,
      trim: true,
      default: ""
    },

    esNuevo: {
      type: Boolean,
      default: false
    },

    esDestacado: {
      type: Boolean,
      default: false
    },

    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Product", productSchema);