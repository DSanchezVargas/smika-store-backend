const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre de la disponibilidad es obligatorio"],
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    value: {
      type: String,
      required: [true, "El valor de la disponibilidad es obligatorio"],
      unique: true,
      trim: true
    },

    estado: {
      type: String,
      enum: ["Activo", "Preventa", "Por pedido", "Agotado", "Inactivo"],
      default: "Activo"
    },

    descripcion: {
      type: String,
      trim: true,
      default: ""
    },

    orden: {
      type: Number,
      default: 0
    },

    esDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Availability", availabilitySchema);