const mongoose = require("mongoose");

const originSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El país u origen es obligatorio"],
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

    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Origin", originSchema);