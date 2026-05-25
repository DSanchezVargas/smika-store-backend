const UserPreference = require("../models/UserPreference");
const Product = require("../models/Product");

const getCurrentUserId = (req) => {
  return req.user._id || req.user.id;
};

const getMyRecommendations = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const preferences = await UserPreference.findOne({
      usuario: userId,
      activo: true
    });

    if (!preferences) {
      return res.json({
        message: "Todavía no hay preferencias para generar recomendaciones",
        total: 0,
        recommendations: []
      });
    }

    const excludedProducts = [
      ...preferences.productosFavoritos,
      ...preferences.listaDeseos
    ];

    const conditions = [];

    if (preferences.seriesFavoritas.length > 0) {
      conditions.push({
        serie: { $in: preferences.seriesFavoritas }
      });
    }

    if (preferences.categoriasFavoritas.length > 0) {
      conditions.push({
        categoria: { $in: preferences.categoriasFavoritas }
      });
    }

    if (conditions.length === 0) {
      return res.json({
        message: "Agrega series, categorías o productos favoritos para recibir recomendaciones",
        total: 0,
        recommendations: []
      });
    }

    const recommendations = await Product.find({
      activo: true,
      disponibilidad: { $ne: "agotado" },
      _id: { $nin: excludedProducts },
      $or: conditions
    })
      .populate("categoria", "nombre slug")
      .populate("subcategoria", "nombre slug")
      .populate("serie", "nombre slug imagen")
      .populate("evento", "titulo slug")
      .populate("origen", "nombre slug")
      .populate("personajes", "nombre slug tipo")
      .sort({ esNuevo: -1, esDestacado: -1, createdAt: -1 })
      .limit(12);

    res.json({
      message: "Recomendaciones obtenidas correctamente",
      total: recommendations.length,
      recommendations
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener recomendaciones",
      error: error.message
    });
  }
};

module.exports = {
  getMyRecommendations
};