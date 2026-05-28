const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true
    },

    apellido: {
      type: String,
      required: [true, "El apellido es obligatorio"],
      trim: true
    },

    alias: {
      type: String,
      trim: true,
      default: ""
    },

    genero: {
      type: String,
      enum: ["masculino", "femenino", "prefiero_no_decir", ""],
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
      required: [true, "El correo es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      default: ""
    },

   role: {
  type: String,
  enum: ["cliente", "admin", "subadmin"],
  default: "cliente"
},

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },

    googleId: {
      type: String,
      trim: true,
      default: ""
    },

    emailVerified: {
      type: Boolean,
      default: false
    },

    resetPasswordCodeHash: {
      type: String,
      default: ""
    },

    resetPasswordExpires: {
      type: Date,
      default: null
    },

    resetPasswordAttempts: {
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

module.exports = mongoose.model("User", userSchema);