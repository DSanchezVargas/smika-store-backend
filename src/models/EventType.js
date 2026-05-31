const mongoose = require("mongoose");

const eventTypeSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del tipo de evento es obligatorio"],
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

    orden: {
      type: Number,
      default: 0
    },

    esDefault: {
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

module.exports = mongoose.model("EventType", eventTypeSchema);
