const UserPreference = require("../models/UserPreference");
const Product = require("../models/Product");
const Series = require("../models/Series");
const Category = require("../models/Category");

const getCurrentUserId = (req) => {
  return req.user._id || req.user.id;
};

const getOrCreatePreferences = async (userId) => {
  let preferences = await UserPreference.findOne({ usuario: userId });

  if (!preferences) {
    preferences = await UserPreference.create({
      usuario: userId
    });
  }

  return preferences;
};

const toggleItemInArray = (array, itemId) => {
  const itemIdText = itemId.toString();

  const exists = array.some((id) => id.toString() === itemIdText);

  if (exists) {
    return {
      updatedArray: array.filter((id) => id.toString() !== itemIdText),
      added: false
    };
  }

  return {
    updatedArray: [...array, itemId],
    added: true
  };
};

const getMyPreferences = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const preferences = await getOrCreatePreferences(userId);

    const populatedPreferences = await UserPreference.findById(preferences._id)
      .populate("seriesFavoritas", "nombre slug imagen")
      .populate("categoriasFavoritas", "nombre slug tipo")
      .populate("productosFavoritos", "nombre slug imagenes precioReferencial stock disponibilidad")
      .populate("listaDeseos", "nombre slug imagenes precioReferencial stock disponibilidad");

    res.json({
      message: "Preferencias obtenidas correctamente",
      preferences: populatedPreferences
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener preferencias",
      error: error.message
    });
  }
};

const toggleFavoriteSeries = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { serieId } = req.params;

    const serie = await Series.findOne({
      _id: serieId,
      activa: true
    });

    if (!serie) {
      return res.status(404).json({
        message: "Serie no encontrada"
      });
    }

    const preferences = await getOrCreatePreferences(userId);

    const result = toggleItemInArray(preferences.seriesFavoritas, serieId);
    preferences.seriesFavoritas = result.updatedArray;

    await preferences.save();

    res.json({
      message: result.added
        ? "Serie agregada a favoritos"
        : "Serie retirada de favoritos",
      added: result.added,
      preferences
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar serie favorita",
      error: error.message
    });
  }
};

const toggleFavoriteCategory = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { categoryId } = req.params;

    const category = await Category.findOne({
      _id: categoryId,
      activa: true
    });

    if (!category) {
      return res.status(404).json({
        message: "Categoría no encontrada"
      });
    }

    const preferences = await getOrCreatePreferences(userId);

    const result = toggleItemInArray(preferences.categoriasFavoritas, categoryId);
    preferences.categoriasFavoritas = result.updatedArray;

    await preferences.save();

    res.json({
      message: result.added
        ? "Categoría agregada a favoritos"
        : "Categoría retirada de favoritos",
      added: result.added,
      preferences
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar categoría favorita",
      error: error.message
    });
  }
};

const toggleFavoriteProduct = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      activo: true
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    const preferences = await getOrCreatePreferences(userId);

    const result = toggleItemInArray(preferences.productosFavoritos, productId);
    preferences.productosFavoritos = result.updatedArray;

    await preferences.save();

    res.json({
      message: result.added
        ? "Producto agregado a favoritos"
        : "Producto retirado de favoritos",
      added: result.added,
      preferences
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar producto favorito",
      error: error.message
    });
  }
};

const toggleWishlistProduct = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { productId } = req.params;

    const product = await Product.findOne({
      _id: productId,
      activo: true
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    const preferences = await getOrCreatePreferences(userId);

    const result = toggleItemInArray(preferences.listaDeseos, productId);
    preferences.listaDeseos = result.updatedArray;

    await preferences.save();

    res.json({
      message: result.added
        ? "Producto agregado a lista de deseos"
        : "Producto retirado de lista de deseos",
      added: result.added,
      preferences
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar lista de deseos",
      error: error.message
    });
  }
};

const updateNotificationPreference = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { recibirNotificaciones } = req.body;

    const preferences = await getOrCreatePreferences(userId);

    preferences.recibirNotificaciones = recibirNotificaciones;
    await preferences.save();

    res.json({
      message: "Preferencia de notificaciones actualizada correctamente",
      preferences
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar preferencia de notificaciones",
      error: error.message
    });
  }
};

module.exports = {
  getMyPreferences,
  toggleFavoriteSeries,
  toggleFavoriteCategory,
  toggleFavoriteProduct,
  toggleWishlistProduct,
  updateNotificationPreference
};