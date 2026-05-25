const mongoose = require("mongoose");

const userPreferenceSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El usuario es obligatorio"],
      unique: true
    },

    seriesFavoritas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Series"
      }
    ],

    categoriasFavoritas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category"
      }
    ],

    productosFavoritos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      }
    ],

    listaDeseos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      }
    ],

    recibirNotificaciones: {
      type: Boolean,
      default: true
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

module.exports = mongoose.model("UserPreference", userPreferenceSchema);