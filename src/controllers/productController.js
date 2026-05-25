const Product = require("../models/Product");
const Notification = require("../models/Notification");
const { createSlug } = require("../utils/slugHelper");
const { emitSocketEvent } = require("../utils/socketHelper");

const LOW_STOCK_LIMIT = 5;

const getProductNotificationMessage = (type, product) => {
  if (type === "stock_bajo") {
    return {
      titulo: "Producto por agotarse",
      mensaje: `El producto "${product.nombre}" tiene pocas unidades disponibles.`
    };
  }

  if (type === "producto_agotado") {
    return {
      titulo: "Producto agotado",
      mensaje: `El producto "${product.nombre}" se agotó.`
    };
  }

  if (type === "producto_restock") {
    return {
      titulo: "Producto de vuelta en stock",
      mensaje: `El producto "${product.nombre}" volvió a estar disponible.`
    };
  }

  return {
    titulo: "Novedad de producto",
    mensaje: `Hay una novedad relacionada con el producto "${product.nombre}".`
  };
};

const createProductRelatedNotifications = async (req, product, type) => {
  const { titulo, mensaje } = getProductNotificationMessage(type, product);

  const baseNotification = {
    titulo,
    mensaje,
    tipo: type,
    producto: product._id,
    serie: product.serie || null,
    categoria: product.categoria || null,
    evento: product.evento || null,
    creadaPor: req.user?._id || req.user?.id || null
  };

  const notifications = await Notification.insertMany([
    {
      ...baseNotification,
      destinatarioTipo: "por_lista_deseos"
    },
    {
      ...baseNotification,
      destinatarioTipo: "por_preferencias"
    }
  ]);

  emitSocketEvent(req, "notification_created", {
    message: "Notificaciones de producto creadas",
    notifications
  });

  return notifications;
};

const detectStockNotificationType = (
  product,
  previousStock,
  previousDisponibilidad
) => {
  const currentStock = Number(product.stock || 0);
  const oldStock = Number(previousStock || 0);

  const currentDisponibilidad = product.disponibilidad;
  const oldDisponibilidad = previousDisponibilidad;

  if (
    (oldStock > 0 && currentStock === 0) ||
    (oldDisponibilidad !== "agotado" && currentDisponibilidad === "agotado")
  ) {
    return "producto_agotado";
  }

  if (
    (oldStock === 0 || oldDisponibilidad === "agotado") &&
    currentStock > 0 &&
    currentDisponibilidad !== "agotado"
  ) {
    return "producto_restock";
  }

  if (
    oldStock > LOW_STOCK_LIMIT &&
    currentStock > 0 &&
    currentStock <= LOW_STOCK_LIMIT
  ) {
    return "stock_bajo";
  }

  return null;
};

const createNewProductNotification = async (req, product) => {
  if (!product.esNuevo && !product.esDestacado) {
    return null;
  }

  const notification = await Notification.create({
    titulo: "Nuevo producto disponible",
    mensaje: `Smika Store agregó el producto "${product.nombre}".`,
    tipo: "novedad",
    destinatarioTipo: "por_preferencias",
    producto: product._id,
    serie: product.serie || null,
    categoria: product.categoria || null,
    evento: product.evento || null,
    creadaPor: req.user?._id || req.user?.id || null
  });

  emitSocketEvent(req, "notification_created", {
    message: "Notificación de nuevo producto creada",
    notification
  });

  return notification;
};

const getProducts = async (req, res) => {
  try {
    const {
      search,
      categoria,
      subcategoria,
      serie,
      evento,
      origen,
      disponibilidad,
      esNuevo,
      esDestacado,
      activos
    } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activo = true;
    }

    if (search) {
      filter.nombre = { $regex: search, $options: "i" };
    }

    if (categoria) filter.categoria = categoria;
    if (subcategoria) filter.subcategoria = subcategoria;
    if (serie) filter.serie = serie;
    if (evento) filter.evento = evento;
    if (origen) filter.origen = origen;
    if (disponibilidad) filter.disponibilidad = disponibilidad;
    if (esNuevo !== undefined) filter.esNuevo = esNuevo === "true";
    if (esDestacado !== undefined) filter.esDestacado = esDestacado === "true";

    const products = await Product.find(filter)
      .populate("categoria", "nombre slug")
      .populate("subcategoria", "nombre slug")
      .populate({
        path: "serie",
        select: "nombre slug creadores",
        populate: {
          path: "creadores",
          select: "nombre slug tipo"
        }
      })
      .populate("evento", "titulo slug")
      .populate("origen", "nombre slug")
      .populate("personajes", "nombre slug tipo")
      .sort({ createdAt: -1 });

    res.json({
      message: "Lista de productos obtenida correctamente",
      total: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener productos",
      error: error.message
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("categoria", "nombre slug")
      .populate("subcategoria", "nombre slug")
      .populate({
        path: "serie",
        select: "nombre slug creadores",
        populate: {
          path: "creadores",
          select: "nombre slug tipo"
        }
      })
      .populate("evento", "titulo slug")
      .populate("origen", "nombre slug")
      .populate("personajes", "nombre slug tipo");

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    res.json({
      message: "Producto obtenido correctamente",
      product
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener producto",
      error: error.message
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precioReferencial,
      precioAnterior,
      imagenes,
      categoria,
      subcategoria,
      serie,
      evento,
      origen,
      personajes,
      marca,
      tipoProducto,
      disponibilidad,
      stock,
      tiempoEstimado,
      esNuevo,
      esDestacado
    } = req.body;

    const slug = createSlug(nombre);

    const productExists = await Product.findOne({ slug });

    if (productExists) {
      return res.status(400).json({
        message: "Este producto ya existe"
      });
    }

    const product = await Product.create({
      nombre,
      slug,
      descripcion,
      precioReferencial,
      precioAnterior: precioAnterior || null,
      imagenes: imagenes || [],
      categoria,
      subcategoria: subcategoria || null,
      serie,
      evento: evento || null,
      origen,
      personajes: personajes || [],
      marca,
      tipoProducto,
      disponibilidad,
      stock,
      tiempoEstimado,
      esNuevo,
      esDestacado
    });

    await createNewProductNotification(req, product);

    emitSocketEvent(req, "product_created", {
      message: "Nuevo producto creado",
      product
    });

    res.status(201).json({
      message: "Producto creado correctamente",
      product
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear producto",
      error: error.message
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precioReferencial,
      precioAnterior,
      imagenes,
      categoria,
      subcategoria,
      serie,
      evento,
      origen,
      personajes,
      marca,
      tipoProducto,
      disponibilidad,
      stock,
      tiempoEstimado,
      esNuevo,
      esDestacado,
      activo
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    const previousStock = product.stock;
    const previousDisponibilidad = product.disponibilidad;

    if (nombre) {
      const slug = createSlug(nombre);

      const duplicatedProduct = await Product.findOne({
        slug,
        _id: { $ne: product._id }
      });

      if (duplicatedProduct) {
        return res.status(400).json({
          message: "Ya existe otro producto con ese nombre"
        });
      }

      product.nombre = nombre;
      product.slug = slug;
    }

    if (descripcion !== undefined) product.descripcion = descripcion;
    if (precioReferencial !== undefined) product.precioReferencial = precioReferencial;
    if (precioAnterior !== undefined) product.precioAnterior = precioAnterior || null;
    if (imagenes !== undefined) product.imagenes = imagenes;
    if (categoria !== undefined) product.categoria = categoria;
    if (subcategoria !== undefined) product.subcategoria = subcategoria || null;
    if (serie !== undefined) product.serie = serie;
    if (evento !== undefined) product.evento = evento || null;
    if (origen !== undefined) product.origen = origen;
    if (personajes !== undefined) product.personajes = personajes;
    if (marca !== undefined) product.marca = marca;
    if (tipoProducto !== undefined) product.tipoProducto = tipoProducto;
    if (disponibilidad !== undefined) product.disponibilidad = disponibilidad;
    if (stock !== undefined) product.stock = stock;
    if (tiempoEstimado !== undefined) product.tiempoEstimado = tiempoEstimado;
    if (esNuevo !== undefined) product.esNuevo = esNuevo;
    if (esDestacado !== undefined) product.esDestacado = esDestacado;
    if (activo !== undefined) product.activo = activo;

    await product.save();

    const stockNotificationType = detectStockNotificationType(
      product,
      previousStock,
      previousDisponibilidad
    );

    if (stockNotificationType) {
      await createProductRelatedNotifications(req, product, stockNotificationType);
    }

    emitSocketEvent(req, "product_updated", {
      message: "Producto actualizado",
      product
    });

    res.json({
      message: "Producto actualizado correctamente",
      product
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar producto",
      error: error.message
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    product.activo = false;
    await product.save();

    emitSocketEvent(req, "product_deleted", {
      message: "Producto desactivado",
      productId: product._id
    });

    res.json({
      message: "Producto desactivado correctamente"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar producto",
      error: error.message
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};