const mongoose = require("mongoose");

const Product = require("../models/Product");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const { createSlug } = require("../utils/slugHelper");
const { emitSocketEvent } = require("../utils/socketHelper");

const LOW_STOCK_LIMIT = 5;
const PERU_TIME_ZONE = "America/Lima";

const PRODUCT_LIST_SELECT = [
  "nombre",
  "slug",
  "descripcion",
  "precioReferencial",
  "precio",
  "precioAnterior",
  "varianteTipo",
  "variantes",
  "categoria",
  "categoriaNombre",
  "subcategoria",
  "subcategoriaNombre",
  "serie",
  "serieNombre",
  "evento",
  "eventoNombre",
  "origen",
  "origenNombre",
  "personajes",
  "personajesNombre",
  "personajeNombre",
  "marca",
  "tipoProducto",
  "material",
  "tamano",
  "disponibilidad",
  "estado",
  "stock",
  "stockTexto",
  "tiempoEstimado",
  "sincronizarDisponibilidadEvento",
  "adulto",
  "esNuevo",
  "esDestacado",
  "activo",
  "createdAt",
  "updatedAt"
].join(" ");

const isValidObjectId = (value) => {
  return value && mongoose.Types.ObjectId.isValid(value);
};

const getObjectIdValue = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return value._id || value.id || "";
  }

  return value;
};

const getOptionalObjectId = (value) => {
  const objectIdValue = getObjectIdValue(value);

  return isValidObjectId(objectIdValue) ? objectIdValue : null;
};

const getTextValue = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  if (Array.isArray(found)) {
    return found
      .map((item) => getTextValue(item))
      .filter(Boolean)
      .join(", ")
      .trim();
  }

  if (found && typeof found === "object") {
    return found.nombre || found.titulo || found.name || "";
  }

  return found ? found.toString().trim() : "";
};

const getNumberValue = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return Number(found || 0);
};

const getOptionalBoolean = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  if (found === undefined || found === null || found === "") {
    return undefined;
  }

  if (typeof found === "boolean") return found;

  if (typeof found === "number") return found === 1;

  const cleanValue = found.toString().trim().toLowerCase();

  if (["true", "1", "si", "sí", "yes", "on"].includes(cleanValue)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(cleanValue)) {
    return false;
  }

  return Boolean(found);
};

const getPeruDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PERU_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
};

const getStoredDateKey = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
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

const normalizeVarianteTipo = (value = "") => {
  const cleanValue = value.toString().trim().toLowerCase();

  if (["precio_igual", "igual", "same_price", "mismo_precio"].includes(cleanValue)) {
    return "precio_igual";
  }

  if (["precio_diferente", "diferente", "different_price", "precio_variable"].includes(cleanValue)) {
    return "precio_diferente";
  }

  return "sin_variantes";
};

const createVariantCode = (text = "", index = 0) => {
  const slug = text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return slug || `opcion-${index + 1}`;
};

const normalizeProductVariants = (
  variants = [],
  variantMode = "sin_variantes",
  basePrice = 0
) => {
  if (variantMode === "sin_variantes" || !Array.isArray(variants)) return [];

  const seenCodes = new Set();

  return variants
    .map((variant, index) => {
      const nombre = getTextValue(
        variant?.nombre,
        variant?.name,
        variant?.label,
        variant?.titulo
      );

      if (!nombre) return null;

      const rawCode = getTextValue(variant?.codigo, variant?.code, variant?.id);
      let codigo = rawCode || createVariantCode(nombre, index);

      while (seenCodes.has(codigo)) {
        codigo = `${codigo}-${index + 1}`;
      }

      seenCodes.add(codigo);

      const variantPrice =
        variantMode === "precio_diferente"
          ? getNumberValue(variant?.precio, variant?.price, variant?.precioReferencial)
          : Number(basePrice || 0);

      const rawImagenIndex = getNumberValue(
        variant?.imagenIndex,
        variant?.imageIndex,
        variant?.selectedImageIndex
      );

      const imagenIndex =
        Number.isFinite(rawImagenIndex) && rawImagenIndex >= 0
          ? Math.floor(rawImagenIndex)
          : 0;

      return {
        codigo,
        nombre,
        precio: Number(variantPrice || 0),
        stock: Number(variant?.stock || 0),
        imagenIndex,
        activa: variant?.activa !== undefined ? Boolean(variant.activa) : true,
        orden: Number(variant?.orden ?? index)
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
};

const getMinimumVariantPrice = (variants = []) => {
  const prices = variants
    .map((variant) => Number(variant?.precio || 0))
    .filter((price) => price >= 0);

  return prices.length > 0 ? Math.min(...prices) : 0;
};

const getAutomaticAvailabilityFromEvent = (event) => {
  if (!event || !event.fechaInicio) return null;

  const todayInPeru = getPeruDateKey();
  const eventStartDate = getStoredDateKey(event.fechaInicio);

  if (!eventStartDate) return null;

  if (todayInPeru >= eventStartDate) {
    return {
      disponibilidad: "por_pedido",
      estado: "Por pedido"
    };
  }

  return {
    disponibilidad: "preventa",
    estado: "Preventa"
  };
};

const getImageSource = (image) => {
  if (!image) return "";

  if (typeof image === "string") return image.trim();

  if (image && typeof image === "object") {
    return (
      image.url ||
      image.finalPreview ||
      image.preview ||
      image.src ||
      image.imagen ||
      ""
    ).trim();
  }

  return "";
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

      const imageUrl = getImageSource(image);

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

const applyAutomaticAvailabilityToPayload = async (
  payload = {},
  currentProduct = null
) => {
  const syncEnabled =
    payload.sincronizarDisponibilidadEvento !== undefined
      ? payload.sincronizarDisponibilidadEvento
      : currentProduct?.sincronizarDisponibilidadEvento !== false;

  if (!syncEnabled) {
    return payload;
  }

  const eventId = getObjectIdValue(payload.evento || currentProduct?.evento);

  if (!isValidObjectId(eventId)) {
    return payload;
  }

  const event = await Event.findById(eventId).select("fechaInicio");

  const automaticAvailability = getAutomaticAvailabilityFromEvent(event);

  if (!automaticAvailability) {
    return payload;
  }

  payload.disponibilidad = automaticAvailability.disponibilidad;
  payload.estado = automaticAvailability.estado;

  return payload;
};

const syncProductAvailabilityByEvent = async (product, options = {}) => {
  const persistChanges = options.persist !== false;
  if (!product) return product;

  if (product.sincronizarDisponibilidadEvento === false) {
    return product;
  }

  if (product.activo === false || product.estado === "Inactivo") {
    return product;
  }

  const eventId = getObjectIdValue(product.evento);

  if (!isValidObjectId(eventId)) {
    return product;
  }

  let event = product.evento;

  if (!event || !event.fechaInicio) {
    event = await Event.findById(eventId).select("fechaInicio");
  }

  const automaticAvailability = getAutomaticAvailabilityFromEvent(event);

  if (!automaticAvailability) {
    return product;
  }

  const mustUpdate =
    product.disponibilidad !== automaticAvailability.disponibilidad ||
    product.estado !== automaticAvailability.estado;

  if (!mustUpdate) {
    return product;
  }

  product.disponibilidad = automaticAvailability.disponibilidad;
  product.estado = automaticAvailability.estado;

  if (persistChanges && typeof product.save === "function") {
    await product.save();
  }

  return product;
};

const syncProductsAvailabilityByEvent = async (products = [], options = {}) => {
  await Promise.all(
    products.map((product) => syncProductAvailabilityByEvent(product, options))
  );

  return products;
};

const buildProductPayload = (body = {}, options = {}) => {
  const disponibilidad = normalizeDisponibilidad(
    body.disponibilidad,
    body.estado
  );

  const estado = normalizeEstado(body.estado, disponibilidad);

  const requestedVariantMode = normalizeVarianteTipo(
    body.varianteTipo || body.tipoVariante || body.variantMode
  );

  const basePrice = getNumberValue(
    body.precioReferencial,
    body.precio,
    body.price
  );

  const normalizedVariants = normalizeProductVariants(
    body.variantes || body.variants || [],
    requestedVariantMode,
    basePrice
  );

  const price =
    requestedVariantMode === "precio_diferente" && normalizedVariants.length > 0
      ? getMinimumVariantPrice(normalizedVariants)
      : basePrice;

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

  const syncDisponibilidad = getOptionalBoolean(
    body.sincronizarDisponibilidadEvento,
    body.syncDisponibilidadEvento,
    body.sincronizarConEvento
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

    varianteTipo: requestedVariantMode,
    variantes: normalizedVariants,

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

  if (syncDisponibilidad !== undefined) {
    payload.sincronizarDisponibilidadEvento = syncDisponibilidad;
  } else if (options.defaultSyncDisponibilidad !== undefined) {
    payload.sincronizarDisponibilidadEvento = Boolean(
      options.defaultSyncDisponibilidad
    );
  }

  if (shouldReplaceImages(body, options.includeImages === true)) {
    const normalizedImages = normalizeImages(body.imagenes || []);
    const canClearImages =
      body.borrarImagenes === true ||
      body.clearImages === true ||
      body.limpiarImagenes === true;

    // Protección: al editar, si el frontend llega con imagenesTouched pero sin imágenes,
    // NO se reemplaza el arreglo existente. Así evitamos borrar imágenes guardadas
    // por abrir un producto desde una lista liviana o por un fallo de carga.
    if (options.includeImages === true || normalizedImages.length > 0 || canClearImages) {
      payload.imagenes = normalizedImages;
    }
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
      select: "nombre slug creadores pais origenNombre",
      populate: {
        path: "creadores",
        select: "nombre slug tipo"
      }
    })
    .populate("evento", "titulo nombre slug fechaInicio fechaFin estado")
    .populate("origen", "nombre slug code")
    .populate("personajes", "nombre slug tipo");
};

const populateProductList = (query) => {
  return query
    .populate("categoria", "nombre slug")
    .populate("subcategoria", "nombre slug")
    .populate("serie", "nombre slug pais origenNombre")
    .populate("evento", "titulo nombre slug fechaInicio fechaFin estado")
    .populate("origen", "nombre slug code")
    .populate("personajes", "nombre slug tipo");
};

const applySafeProductListQueryOptions = (query) => {
  if (typeof query.allowDiskUse === "function") {
    return query.allowDiskUse(true);
  }

  return query;
};

const getRequestBaseUrl = (req) => {
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProtocol)
    ? forwardedProtocol[0]
    : (forwardedProtocol || req.protocol || "https").split(",")[0].trim();

  const forwardedHost = req.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : (forwardedHost || req.get("host") || "").split(",")[0].trim();

  return `${protocol}://${host}`;
};

const getProductImageEndpoint = (req, productId, index = 0) => {
  if (!req || !productId) return "";

  return `${getRequestBaseUrl(req)}/api/products/${productId}/image/${index}`;
};

const parseDataImage = (source = "") => {
  if (typeof source !== "string") return null;

  const match = source.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) return null;

  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
};

const compactImageForList = (image = {}, productId = "", index = 0, req = null) => {
  const source = getImageSource(image);

  if (!source) return null;

  const isBase64Image = source.startsWith("data:image");
  const displaySource = isBase64Image
    ? getProductImageEndpoint(req, productId, index)
    : source;

  if (!displaySource) return null;

  if (typeof image === "string") {
    return {
      url: displaySource,
      preview: displaySource,
      finalPreview: displaySource,
      storage: isBase64Image ? "backend-image" : "external"
    };
  }

  return {
    url: displaySource,
    preview: displaySource,
    finalPreview: displaySource,
    publicId: image.publicId || "",
    name: image.name || image.nombre || image.originalName || "",
    originalName: image.originalName || image.name || "",
    storage: isBase64Image
      ? "backend-image"
      : image.storage || (source.startsWith("data:") ? "local-data-url" : "external"),
    size: Number(image.size || 0),
    finalSize: Number(image.finalSize || image.size || 0),
    width: Number(image.width || image.finalWidth || 0),
    height: Number(image.height || image.finalHeight || 0),
    finalWidth: Number(image.finalWidth || image.width || 0),
    finalHeight: Number(image.finalHeight || image.height || 0)
  };
};

const normalizeProductListItem = (product = {}, req = null) => {
  const plainProduct = product?.toObject ? product.toObject() : product;
  const productId = plainProduct._id?.toString?.() || plainProduct.id || "";
  const imagesCount = Array.isArray(plainProduct.imagenes) ? plainProduct.imagenes.length : 0;
  const firstImage = Array.isArray(plainProduct.imagenes)
    ? compactImageForList(plainProduct.imagenes[0], productId, 0, req)
    : null;

  return {
    ...plainProduct,
    id: plainProduct._id,
    _id: plainProduct._id,

    categoriaNombre:
      plainProduct.categoria?.nombre || plainProduct.categoriaNombre || "",
    subcategoriaNombre:
      plainProduct.subcategoria?.nombre || plainProduct.subcategoriaNombre || "",
    serieNombre: plainProduct.serie?.nombre || plainProduct.serieNombre || "",
    eventoNombre: plainProduct.evento?.titulo || plainProduct.eventoNombre || "",
    origenNombre: plainProduct.origen?.nombre || plainProduct.origenNombre || "",

    // El listado no transporta base64 pesado. Si la imagen está guardada como base64,
    // se expone como URL JPG/PNG desde el backend: /api/products/:id/image/:index.
    // Para editar, GET /api/products/:id sigue trayendo todas las imágenes completas.
    imagenes: firstImage ? [firstImage] : [],
    imagenesCount: imagesCount,
    imagenPortada: firstImage || null
  };
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

    const productsQuery = applySafeProductListQueryOptions(
      populateProductList(
        Product.find(filter)
          .select(`${PRODUCT_LIST_SELECT} imagenes`)
          .slice("imagenes", 1)
          .sort({ _id: -1 })
      )
    );

    const products = await productsQuery;

    res.json({
      message: "Lista de productos obtenida correctamente",
      total: products.length,
      products: products.map((product) => normalizeProductListItem(product, req))
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);

    res.status(500).json({
      message: "Error al obtener productos",
      error: error.message
    });
  }
};

const getProductImage = async (req, res) => {
  try {
    const { id, index = 0 } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "ID de producto inválido"
      });
    }

    const imageIndex = Math.max(Number(index || 0), 0);
    const product = await Product.findById(id).select("imagenes nombre").lean();

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    const image = Array.isArray(product.imagenes) ? product.imagenes[imageIndex] : null;
    const source = getImageSource(image);

    if (!source) {
      return res.status(404).json({
        message: "Imagen no encontrada"
      });
    }

    if (/^https?:\/\//i.test(source)) {
      return res.redirect(source);
    }

    const parsed = parseDataImage(source);

    if (!parsed) {
      return res.status(404).json({
        message: "La imagen no está disponible como archivo"
      });
    }

    res.setHeader("Content-Type", parsed.mime || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.setHeader("X-Smika-Image-Source", "mongodb-base64");

    return res.send(parsed.buffer);
  } catch (error) {
    console.error("Error al obtener imagen de producto:", error);

    return res.status(500).json({
      message: "Error al obtener imagen de producto",
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

    await syncProductAvailabilityByEvent(product, {
      persist: false
    });

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
      includeImages: true,
      defaultSyncDisponibilidad: true
    });

    await applyAutomaticAvailabilityToPayload(payload);

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

    await applyAutomaticAvailabilityToPayload(payload, product);

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
  getProductImage,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};