const mongoose = require("mongoose");

const Product = require("../models/Product");
const Notification = require("../models/Notification");
const { createSlug } = require("../utils/slugHelper");
const { emitSocketEvent } = require("../utils/socketHelper");

const LOW_STOCK_LIMIT = 5;

const isValidObjectId = (value) => {
  return value && mongoose.Types.ObjectId.isValid(value);
};

const getOptionalObjectId = (value) => {
  return isValidObjectId(value) ? value : null;
};

const getTextValue = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return found ? found.toString().trim() : "";
};

const getNumberValue = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return Number(found || 0);
};

const normalizeEstado = (estado = "", disponibilidad = "") => {
  if (estado) return estado;

  if (disponibilidad === "preventa") return "Preventa";
  if (disponibilidad === "por_pedido") return "Por pedido";
  if (disponibilidad === "agotado") return "Agotado";

  return "Activo";
};

const normalizeDisponibilidad = (disponibilidad = "", estado = "") => {
  if (disponibilidad) return disponibilidad;

  const cleanEstado = estado.toString().toLowerCase();

  if (cleanEstado.includes("preventa")) return "preventa";
  if (cleanEstado.includes("pedido")) return "por_pedido";
  if (cleanEstado.includes("agotado")) return "agotado";

  return "stock";
};

const normalizeImages = (imagenes = []) => {
  if (!Array.isArray(imagenes)) return [];

  return imagenes
    .map((image) => {
      if (typeof image === "string") {
        return {
          url: image,
          preview: image,
          finalPreview: image,
          storage: image.startsWith("data:") ? "local-data-url" : "external"
        };
      }

      const imageUrl =
        image.url || image.finalPreview || image.preview || image.imagen || "";

      return {
        url: imageUrl,
        preview: image.preview || imageUrl,
        finalPreview: image.finalPreview || imageUrl,
        publicId: image.publicId || "",
        name: image.name || image.nombre || "",
        originalName: image.originalName || "",
        size: Number(image.size || 0),
        finalSize: Number(image.finalSize || image.size || 0),
        width: Number(image.width || 0),
        height: Number(image.height || 0),
        finalWidth: Number(image.finalWidth || 0),
        finalHeight: Number(image.finalHeight || 0),
        crop: image.crop || {
          x: 0,
          y: 0,
          width: 100,
          height: 100
        },
        zoom: Number(image.zoom || 1),
        pan: image.pan || {
          x: 0,
          y: 0
        },
        storage:
          image.storage ||
          (imageUrl.startsWith("data:") ? "local-data-url" : "")
      };
    })
    .filter((image) => image.url || image.finalPreview || image.preview);
};

const shouldReplaceImages = (body = {}, includeImages = false) => {
  if (includeImages) return true;

  return (
    body.replaceImages === true ||
    body.reemplazarImagenes === true ||
    body.imagenesTouched === true ||
    body.imagesTouched === true
  );
};

const buildProductPayload = (body = {}, options = {}) => {
  const disponibilidad = normalizeDisponibilidad(
    body.disponibilidad,
    body.estado
  );

  const estado = normalizeEstado(body.estado, disponibilidad);

  const price = getNumberValue(
    body.precioReferencial,
    body.precio,
    body.price
  );

  const serieNombre = getTextValue(
    body.serieNombre,
    body.serieTexto,
    body.series,
    isValidObjectId(body.serie) ? "" : body.serie
  );

  const eventoNombre = getTextValue(
    body.eventoNombre,
    body.eventoTexto,
    body.event,
    isValidObjectId(body.evento) ? "" : body.evento
  );

  const categoriaNombre = getTextValue(
    body.categoriaNombre,
    body.categoriaTexto,
    isValidObjectId(body.categoria) ? "" : body.categoria
  );

  const origenNombre = getTextValue(
    body.origenNombre,
    body.origenTexto,
    body.pais,
    body.countryCode,
    body.origen,
    isValidObjectId(body.origen) ? "" : body.origen
  );

  const tipoProducto = getTextValue(
    body.tipoProducto,
    body.tipo,
    body.type
  );

  const payload = {
    nombre: getTextValue(body.nombre, body.name),
    descripcion:
      body.descripcion ||
      "Producto registrado desde el panel administrador de Smika Store.",

    precioReferencial: price,
    precio: price,
    precioAnterior:
      body.precioAnterior !== undefined && body.precioAnterior !== ""
        ? Number(body.precioAnterior)
        : null,

    categoria: getOptionalObjectId(body.categoria),
    categoriaNombre,

    subcategoria: getOptionalObjectId(body.subcategoria),
    subcategoriaNombre: getTextValue(body.subcategoriaNombre),

    serie: getOptionalObjectId(body.serie),
    serieNombre,

    evento: getOptionalObjectId(body.evento),
    eventoNombre,

    origen: getOptionalObjectId(body.origen),
    origenNombre,

    personajes: Array.isArray(body.personajes)
      ? body.personajes.filter(isValidObjectId)
      : [],

    personajesNombre: Array.isArray(body.personajesNombre)
      ? body.personajesNombre
      : [],

    personajeNombre: getTextValue(body.personajeNombre, body.personaje),

    marca: body.marca || "Sin marca",
    tipoProducto,

    material: body.material || "",
    tamano: body.tamano || "",

    disponibilidad,
    estado,

    stock: Number(body.stock || 0),
    tiempoEstimado: body.tiempoEstimado || "",

    adulto: Boolean(body.adulto),
    esNuevo: body.esNuevo !== undefined ? Boolean(body.esNuevo) : true,
    esDestacado:
      body.esDestacado !== undefined ? Boolean(body.esDestacado) : false,

    activo:
      body.activo !== undefined
        ? Boolean(body.activo)
        : estado !== "Inactivo"
  };

  if (shouldReplaceImages(body, options.includeImages === true)) {
    payload.imagenes = normalizeImages(body.imagenes || []);
  }

  return payload;
};

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
  try {
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
  } catch (error) {
    console.log("No se pudo crear notificación de producto:", error.message);
    return null;
  }
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
  try {
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
  } catch (error) {
    console.log("No se pudo crear notificación de nuevo producto:", error.message);
    return null;
  }
};

const populateProduct = (query) => {
  return query
    .populate("categoria", "nombre slug")
    .populate("subcategoria", "nombre slug")
    .populate({
      path: "serie",
      select: "nombre slug creadores pais",
      populate: {
        path: "creadores",
        select: "nombre slug tipo"
      }
    })
    .populate("evento", "titulo nombre slug")
    .populate("origen", "nombre slug code")
    .populate("personajes", "nombre slug tipo");
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
      estado,
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

    if (categoria) {
      if (isValidObjectId(categoria)) filter.categoria = categoria;
      else filter.categoriaNombre = { $regex: categoria, $options: "i" };
    }

    if (subcategoria) {
      if (isValidObjectId(subcategoria)) filter.subcategoria = subcategoria;
      else filter.subcategoriaNombre = { $regex: subcategoria, $options: "i" };
    }

    if (serie) {
      if (isValidObjectId(serie)) filter.serie = serie;
      else filter.serieNombre = { $regex: serie, $options: "i" };
    }

    if (evento) {
      if (isValidObjectId(evento)) filter.evento = evento;
      else filter.eventoNombre = { $regex: evento, $options: "i" };
    }

    if (origen) {
      if (isValidObjectId(origen)) filter.origen = origen;
      else filter.origenNombre = { $regex: origen, $options: "i" };
    }

    if (disponibilidad) filter.disponibilidad = disponibilidad;
    if (estado) filter.estado = estado;
    if (esNuevo !== undefined) filter.esNuevo = esNuevo === "true";
    if (esDestacado !== undefined) filter.esDestacado = esDestacado === "true";

    const products = await populateProduct(
      Product.find(filter).sort({ createdAt: -1 })
    );

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
    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id }
      : { slug: req.params.id };

    const product = await populateProduct(Product.findOne(query));

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
    const payload = buildProductPayload(req.body, {
      includeImages: true
    });

    const slug = createSlug(payload.nombre);

    const productExists = await Product.findOne({ slug });

    if (productExists) {
      return res.status(400).json({
        message: "Este producto ya existe"
      });
    }

    const product = await Product.create({
      ...payload,
      slug
    });

    await createNewProductNotification(req, product);

    emitSocketEvent(req, "product_created", {
      message: "Nuevo producto creado",
      product
    });

    const populatedProduct = await populateProduct(Product.findById(product._id));

    res.status(201).json({
      message: "Producto creado correctamente",
      product: populatedProduct
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
    const payload = buildProductPayload(req.body, {
      includeImages: false
    });

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    const previousStock = product.stock;
    const previousDisponibilidad = product.disponibilidad;

    if (payload.nombre) {
      const slug = createSlug(payload.nombre);

      const duplicatedProduct = await Product.findOne({
        slug,
        _id: { $ne: product._id }
      });

      if (duplicatedProduct) {
        return res.status(400).json({
          message: "Ya existe otro producto con ese nombre"
        });
      }

      product.nombre = payload.nombre;
      product.slug = slug;
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (key !== "nombre" && value !== undefined) {
        product[key] = value;
      }
    });

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

    const populatedProduct = await populateProduct(Product.findById(product._id));

    res.json({
      message: "Producto actualizado correctamente",
      product: populatedProduct
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
    product.estado = "Inactivo";

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