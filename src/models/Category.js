const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la categoría es obligatorio"],
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
      trim: true,
      default: ""
    },

    tipo: {
      type: String,
      enum: ["principal", "subcategoria"],
      default: "principal"
    },

    categoriaPadre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },

    imagen: {
      type: String,
      default: ""
    },

    orden: {
      type: Number,
      default: 0
    },

    activa: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Category", categorySchema);