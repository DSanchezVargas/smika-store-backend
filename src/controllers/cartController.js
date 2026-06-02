const Cart = require("../models/Cart");
const Product = require("../models/Product");

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "51936649135";

const PRODUCT_POPULATE_FIELDS =
  "nombre slug precioReferencial precio price imagenes disponibilidad stock estado activo serie serieNombre tipoProducto evento eventoNombre categoriaNombre origenNombre personajesNombre personajeNombre tiempoEstimado varianteTipo variantes";


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

const getActiveProductVariants = (product) => {
  if (!product || product.varianteTipo === "sin_variantes") return [];
  if (!Array.isArray(product.variantes)) return [];

  return product.variantes
    .map((variant, index) => ({
      codigo: variant.codigo || createVariantCode(variant.nombre, index),
      nombre: variant.nombre || variant.name || `Opción ${index + 1}`,
      precio: Number(variant.precio || 0),
      stock: Number(variant.stock || 0),
      activa: variant.activa !== false,
      orden: Number(variant.orden ?? index)
    }))
    .filter((variant) => variant.activa && variant.nombre)
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
};

const getRequestedVariantCode = (body = {}) => {
  const rawValue =
    body.varianteCodigo ||
    body.variantCode ||
    body.opcionCodigo ||
    body.variante?.codigo ||
    body.variante?.code ||
    body.variante?.id ||
    "";

  return rawValue.toString().trim();
};

const findRequestedVariant = (product, body = {}) => {
  const variants = getActiveProductVariants(product);

  if (variants.length === 0) return null;

  const requestedCode = getRequestedVariantCode(body);
  const requestedName = (
    body.varianteNombre ||
    body.variantName ||
    body.opcionNombre ||
    body.variante?.nombre ||
    body.variante?.name ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();

  return (
    variants.find((variant) => variant.codigo === requestedCode) ||
    variants.find((variant) => variant.nombre.toLowerCase() === requestedName) ||
    null
  );
};

const getCartItemVariantCode = (item) => {
  return item?.varianteCodigo || "";
};

const sameCartProductAndVariant = (item, productId, variantCode = "") => {
  return item.producto.toString() === productId && getCartItemVariantCode(item) === variantCode;
};

const getSelectedProductPrice = (product, variant = null) => {
  if (variant && product?.varianteTipo === "precio_diferente") {
    return Number(variant.precio || 0);
  }

  return getProductPrice(product);
};

const getProductId = (product) => {
  return product?._id || product?.id || product || "";
};

const isAvailabilityByConfirmation = (product) => {
  if (!product || typeof product !== "object") return false;

  const stock = Number(product?.stock || 0);
  const tiempoEstimado = (product?.tiempoEstimado || "").trim();
  const disponibilidad = (product?.disponibilidad || "").toString();

  return stock <= 0 && (Boolean(tiempoEstimado) || disponibilidad === "por_pedido");
};

const getAvailabilityText = (product) => {
  const tiempoEstimado = (product?.tiempoEstimado || "").trim();

  if (tiempoEstimado) return tiempoEstimado;

  return "Disponibilidad por confirmar con Smika Store 💖";
};

const getProductPrice = (product) => {
  return Number(
    product?.precioReferencial || product?.precio || product?.price || 0
  );
};

const formatMoney = (value) => {
  return Number(value || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const getItemProductId = (item) => {
  return getProductId(item?.producto);
};

const getCartItemSubtotal = (item) => {
  const product = item?.producto;
  const price = Number(item?.precioReferencialUnitario || getProductPrice(product));

  if (isAvailabilityByConfirmation(product)) {
    return price;
  }

  return Number(item?.cantidad || 1) * price;
};

const calculateCartTotal = (items = []) => {
  return items.reduce((total, item) => total + getCartItemSubtotal(item), 0);
};

const normalizeCartItemsForAvailability = (cart) => {
  if (!cart || !Array.isArray(cart.items)) return cart;

  cart.items.forEach((item) => {
    if (isAvailabilityByConfirmation(item.producto)) {
      item.cantidad = 1;
    }
  });

  cart.totalReferencial = calculateCartTotal(cart.items);

  return cart;
};

const getAuthUserId = (req) => {
  return req.user?._id || req.user?.id || req.user?.userId || "";
};

const ensureLoggedUser = (req, res) => {
  const userId = getAuthUserId(req);

  if (!req.user || !userId) {
    res.status(401).json({
      message: "Debes iniciar sesión para usar tu lista de pedido."
    });

    return false;
  }

  return true;
};

const findActiveCartByUser = async (userId) => {
  return await Cart.findOne({
    usuario: userId,
    estado: "activo"
  }).populate("items.producto", PRODUCT_POPULATE_FIELDS);
};

const saveNormalizedPopulatedCart = async (cart) => {
  if (!cart) return null;

  normalizeCartItemsForAvailability(cart);

  const normalizedItems = cart.items.map((item) => {
    const product = item.producto;
    const selectedVariant = findRequestedVariant(product, item);
    const variantCode = selectedVariant?.codigo || getCartItemVariantCode(item);
    const variantName = selectedVariant?.nombre || item.varianteNombre || "";
    const unitPrice = selectedVariant
      ? getSelectedProductPrice(product, selectedVariant)
      : Number(item.precioReferencialUnitario || getProductPrice(product));

    return {
      producto: getItemProductId(item),
      cantidad: Number(item.cantidad || 1),
      precioReferencialUnitario: Number(unitPrice || 0),
      varianteCodigo: variantCode,
      varianteNombre: variantName,
      variantePrecioReferencial: Number(unitPrice || 0)
    };
  });

  await Cart.findByIdAndUpdate(
    cart._id,
    {
      items: normalizedItems,
      totalReferencial: Number(cart.totalReferencial || 0)
    },
    {
      runValidators: true
    }
  );

  return await findActiveCartByUser(cart.usuario);
};

const syncAndReturnCartByUser = async (userId) => {
  const cart = await findActiveCartByUser(userId);

  if (!cart) return null;

  return await saveNormalizedPopulatedCart(cart);
};

const getOrCreateUserCart = async (userId) => {
  let cart = await syncAndReturnCartByUser(userId);

  if (!cart) {
    await Cart.create({
      usuario: userId,
      sessionId: "",
      items: [],
      totalReferencial: 0,
      estado: "activo"
    });

    cart = await syncAndReturnCartByUser(userId);
  }

  return cart;
};

const getCart = async (req, res) => {
  try {
    if (!ensureLoggedUser(req, res)) return;

    const userId = getAuthUserId(req);
    const cart = await getOrCreateUserCart(userId);

    res.json({
      message: "Lista de pedido obtenida correctamente",
      cart
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener la lista de pedido",
      error: error.message
    });
  }
};

const addToCart = async (req, res) => {
  try {
    if (!ensureLoggedUser(req, res)) return;

    const userId = getAuthUserId(req);
    const { producto, cantidad } = req.body;

    if (!producto) {
      return res.status(400).json({
        message: "El producto es obligatorio"
      });
    }

    const product = await Product.findById(producto);

    if (!product || product.activo === false || product.estado === "Eliminado") {
      return res.status(404).json({
        message: "Producto no encontrado o no disponible"
      });
    }

    const activeVariants = getActiveProductVariants(product);
    const selectedVariant = findRequestedVariant(product, req.body);

    if (activeVariants.length > 0 && !selectedVariant) {
      return res.status(400).json({
        message: "Selecciona una opción del producto antes de agregarlo a la lista."
      });
    }

    const requiresConfirmation = isAvailabilityByConfirmation(product);

    let cart = await Cart.findOne({
      usuario: userId,
      estado: "activo"
    });

    if (!cart) {
      cart = await Cart.create({
        usuario: userId,
        sessionId: "",
        items: [],
        totalReferencial: 0,
        estado: "activo"
      });
    }

    const safeQuantity = requiresConfirmation
      ? 1
      : Math.max(1, Number(cantidad || 1));

    const productPrice = getSelectedProductPrice(product, selectedVariant);
    const selectedVariantCode = selectedVariant?.codigo || "";
    const selectedVariantName = selectedVariant?.nombre || "";

    const existingItem = cart.items.find((item) =>
      sameCartProductAndVariant(item, producto, selectedVariantCode)
    );

    if (existingItem) {
      existingItem.precioReferencialUnitario = productPrice;
      existingItem.varianteCodigo = selectedVariantCode;
      existingItem.varianteNombre = selectedVariantName;
      existingItem.variantePrecioReferencial = productPrice;

      if (requiresConfirmation) {
        existingItem.cantidad = 1;
      } else {
        existingItem.cantidad += safeQuantity;
      }
    } else {
      cart.items.push({
        producto,
        cantidad: safeQuantity,
        precioReferencialUnitario: productPrice,
        varianteCodigo: selectedVariantCode,
        varianteNombre: selectedVariantName,
        variantePrecioReferencial: productPrice
      });
    }

    await cart.save();

    const updatedCart = await syncAndReturnCartByUser(userId);

    res.status(201).json({
      message: requiresConfirmation
        ? "Producto agregado para consultar disponibilidad"
        : "Producto agregado a la lista correctamente",
      cart: updatedCart
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al agregar producto a la lista",
      error: error.message
    });
  }
};

const updateCartItem = async (req, res) => {
  try {
    if (!ensureLoggedUser(req, res)) return;

    const userId = getAuthUserId(req);
    const { producto, cantidad } = req.body;

    if (!producto) {
      return res.status(400).json({
        message: "Debe enviar un producto válido"
      });
    }

    const product = await Product.findById(producto);

    if (!product || product.activo === false) {
      return res.status(404).json({
        message: "Producto no encontrado o no disponible"
      });
    }

    const activeVariants = getActiveProductVariants(product);
    const selectedVariant = activeVariants.length > 0 ? findRequestedVariant(product, req.body) : null;
    const selectedVariantCode = selectedVariant?.codigo || getRequestedVariantCode(req.body);
    const requiresConfirmation = isAvailabilityByConfirmation(product);

    if (activeVariants.length > 0 && !selectedVariantCode) {
      return res.status(400).json({
        message: "Selecciona una opción para actualizar este producto."
      });
    }

    if (!requiresConfirmation && Number(cantidad) < 1) {
      return res.status(400).json({
        message: "La cantidad debe ser mayor a 0"
      });
    }

    const cart = await Cart.findOne({
      usuario: userId,
      estado: "activo"
    });

    if (!cart) {
      return res.status(404).json({
        message: "Lista de pedido no encontrada"
      });
    }

    const item = cart.items.find((cartItem) =>
      sameCartProductAndVariant(cartItem, producto, selectedVariantCode || "")
    );

    if (!item) {
      return res.status(404).json({
        message: "Producto no encontrado dentro de la lista"
      });
    }

    const productPrice = getSelectedProductPrice(product, selectedVariant);

    item.precioReferencialUnitario = productPrice;
    item.varianteCodigo = selectedVariantCode || "";
    item.varianteNombre = selectedVariant?.nombre || item.varianteNombre || "";
    item.variantePrecioReferencial = productPrice;
    item.cantidad = requiresConfirmation ? 1 : Math.max(1, Number(cantidad));

    await cart.save();

    const updatedCart = await syncAndReturnCartByUser(userId);

    res.json({
      message: requiresConfirmation
        ? "Este producto se mantiene como consulta de disponibilidad"
        : "Cantidad actualizada correctamente",
      cart: updatedCart
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar producto de la lista",
      error: error.message
    });
  }
};

const removeCartItem = async (req, res) => {
  try {
    if (!ensureLoggedUser(req, res)) return;

    const userId = getAuthUserId(req);
    const { producto } = req.body;
    const selectedVariantCode = getRequestedVariantCode(req.body);

    if (!producto) {
      return res.status(400).json({
        message: "El producto es obligatorio"
      });
    }

    const cart = await Cart.findOne({
      usuario: userId,
      estado: "activo"
    });

    if (!cart) {
      return res.status(404).json({
        message: "Lista de pedido no encontrada"
      });
    }

    cart.items = cart.items.filter((item) => {
      if (item.producto.toString() !== producto) return true;
      return getCartItemVariantCode(item) !== selectedVariantCode;
    });

    await cart.save();

    const updatedCart = await syncAndReturnCartByUser(userId);

    res.json({
      message: "Producto eliminado de la lista correctamente",
      cart: updatedCart
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar producto de la lista",
      error: error.message
    });
  }
};

const clearCart = async (req, res) => {
  try {
    if (!ensureLoggedUser(req, res)) return;

    const userId = getAuthUserId(req);

    let cart = await Cart.findOne({
      usuario: userId,
      estado: "activo"
    });

    if (!cart) {
      cart = await Cart.create({
        usuario: userId,
        sessionId: "",
        items: [],
        totalReferencial: 0,
        estado: "activo"
      });
    }

    cart.items = [];
    cart.totalReferencial = 0;

    await cart.save();

    const updatedCart = await syncAndReturnCartByUser(userId);

    res.json({
      message: "Lista de pedido vaciada correctamente",
      cart: updatedCart
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al vaciar la lista de pedido",
      error: error.message
    });
  }
};

const buildWhatsAppMessage = async (req, res) => {
  try {
    if (!ensureLoggedUser(req, res)) return;

    const userId = getAuthUserId(req);
    const cart = await syncAndReturnCartByUser(userId);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "No hay productos en la lista de pedido"
      });
    }

    const validItems = cart.items.filter((item) => item.producto);

    if (validItems.length === 0) {
      return res.status(400).json({
        message: "Los productos de la lista ya no están disponibles"
      });
    }

    const totalReferencial = calculateCartTotal(validItems);

    const productLines = validItems
      .map((item, index) => {
        const product = item.producto;
        const cantidad = Number(item.cantidad || 1);
        const precio = Number(item.precioReferencialUnitario || 0);
        const subtotal = cantidad * precio;
        const requiresConfirmation = isAvailabilityByConfirmation(product);

        return [
          `${index + 1}. ${product?.nombre || "Producto Smika"}`,
          item?.varianteNombre ? `   Opción: ${item.varianteNombre}` : "",
          product?.serieNombre ? `   Serie: ${product.serieNombre}` : "",
          product?.tipoProducto ? `   Tipo: ${product.tipoProducto}` : "",
          product?.eventoNombre ? `   Evento: ${product.eventoNombre}` : "",
          requiresConfirmation
            ? `   Disponibilidad: ${getAvailabilityText(product)}`
            : "",
          requiresConfirmation
            ? "   Cantidad: Consultar disponibilidad"
            : `   Cantidad: ${cantidad}`,
          `   Precio referencial: S/ ${formatMoney(precio)}`,
          requiresConfirmation
            ? `   Subtotal referencial: S/ ${formatMoney(precio)}`
            : `   Subtotal: S/ ${formatMoney(subtotal)}`
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const clientName = `${req.user.nombre || req.user.name || ""} ${
      req.user.apellido || req.user.lastName || ""
    }`.trim();

    const clientEmail = req.user.email || req.user.correo || "";
    const clientPhone =
      req.user.telefonoCompleto ||
      req.user.phone ||
      req.user.telefono ||
      "";

    const whatsappMessage = [
      "Hola Smika Store 💖, quiero consultar sobre mi pedido.",
      "",
      "Datos del cliente:",
      `Nombre: ${clientName || req.user.alias || req.user.username || "Cliente"}`,
      clientEmail ? `Correo: ${clientEmail}` : "",
      clientPhone ? `Teléfono: ${clientPhone}` : "",
      "",
      "Productos seleccionados:",
      productLines,
      "",
      `Total referencial: S/ ${formatMoney(totalReferencial)}`,
      "",
      "Quedo atento/a a la confirmación de disponibilidad y coordinación del pedido."
    ]
      .filter((line) => line !== "")
      .join("\n");

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      whatsappMessage
    )}`;

    res.json({
      message: "Mensaje de WhatsApp generado correctamente",
      whatsappMessage,
      whatsappUrl
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al generar mensaje de WhatsApp",
      error: error.message
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  buildWhatsAppMessage
};