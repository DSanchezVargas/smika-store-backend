const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: ""
    },

    preview: {
      type: String,
      default: ""
    },

    finalPreview: {
      type: String,
      default: ""
    },

    publicId: {
      type: String,
      default: ""
    },

    name: {
      type: String,
      default: ""
    },

    originalName: {
      type: String,
      default: ""
    },

    size: {
      type: Number,
      default: 0
    },

    finalSize: {
      type: Number,
      default: 0
    },

    width: {
      type: Number,
      default: 0
    },

    height: {
      type: Number,
      default: 0
    },

    finalWidth: {
      type: Number,
      default: 0
    },

    finalHeight: {
      type: Number,
      default: 0
    },

    crop: {
      x: {
        type: Number,
        default: 0
      },
      y: {
        type: Number,
        default: 0
      },
      width: {
        type: Number,
        default: 100
      },
      height: {
        type: Number,
        default: 100
      }
    },

    zoom: {
      type: Number,
      default: 1
    },

    pan: {
      x: {
        type: Number,
        default: 0
      },
      y: {
        type: Number,
        default: 0
      }
    },

    storage: {
      type: String,
      enum: [
        "local-data-url",
        "uploads",
        "cloudinary",
        "external",
        "existing",
        ""
      ],
      default: ""
    }
  },
  {
    _id: false
  }
);

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
      trim: true,
      default: ""
    },

    precioReferencial: {
      type: Number,
      required: [true, "El precio referencial es obligatorio"],
      min: [0, "El precio no puede ser negativo"]
    },

    precio: {
      type: Number,
      min: [0, "El precio no puede ser negativo"],
      default: 0
    },

    precioAnterior: {
      type: Number,
      default: null
    },

    imagenes: {
      type: [imageSchema],
      default: []
    },

    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },

    categoriaNombre: {
      type: String,
      trim: true,
      default: ""
    },

    subcategoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null
    },

    subcategoriaNombre: {
      type: String,
      trim: true,
      default: ""
    },

    serie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
      default: null
    },

    serieNombre: {
      type: String,
      trim: true,
      default: ""
    },

    evento: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null
    },

    eventoNombre: {
      type: String,
      trim: true,
      default: ""
    },

    origen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Origin",
      default: null
    },

    origenNombre: {
      type: String,
      trim: true,
      default: ""
    },

    personajes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Character"
      }
    ],

    personajesNombre: {
      type: [String],
      default: []
    },

    personajeNombre: {
      type: String,
      trim: true,
      default: ""
    },

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

    material: {
      type: String,
      trim: true,
      default: ""
    },

    tamano: {
      type: String,
      trim: true,
      default: ""
    },

    disponibilidad: {
      type: String,
      trim: true,
      default: "stock"
    },

    estado: {
      type: String,
      enum: ["Activo", "Preventa", "Por pedido", "Agotado", "Inactivo"],
      default: "Activo"
    },

    stock: {
      type: Number,
      default: 0,
      min: [0, "El stock no puede ser negativo"]
    },

    stockTexto: {
      type: String,
      trim: true,
      default: ""
    },

    tiempoEstimado: {
      type: String,
      trim: true,
      default: ""
    },

    sincronizarDisponibilidadEvento: {
      type: Boolean,
      default: true
    },

    adulto: {
      type: Boolean,
      default: false
    },

    esNuevo: {
      type: Boolean,
      default: true
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


productSchema.index({ activo: 1, _id: -1 });
productSchema.index({ serie: 1, activo: 1, _id: -1 });
productSchema.index({ evento: 1, activo: 1, _id: -1 });
productSchema.index({ categoria: 1, activo: 1, _id: -1 });

productSchema.virtual("serieTexto").get(function () {
  return this.serieNombre;
});

productSchema.virtual("eventoTexto").get(function () {
  return this.eventoNombre;
});

productSchema.virtual("origenTexto").get(function () {
  return this.origenNombre;
});

productSchema.set("toJSON", {
  virtuals: true
});

productSchema.set("toObject", {
  virtuals: true
});

module.exports = mongoose.model("Product", productSchema);