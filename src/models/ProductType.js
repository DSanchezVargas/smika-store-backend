const mongoose = require("mongoose");

const productTypeSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del tipo de producto es obligatorio"],
      trim: true,
      unique: true
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

    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

productTypeSchema.set("toJSON", {
  virtuals: true
});

productTypeSchema.set("toObject", {
  virtuals: true
});

module.exports = mongoose.model("ProductType", productTypeSchema);