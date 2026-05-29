const Cart = require("../models/Cart");
const Product = require("../models/Product");

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "51936649135";

const PRODUCT_POPULATE_FIELDS =
  "nombre slug precioReferencial precio price imagenes disponibilidad stock estado activo serie serieNombre tipoProducto evento eventoNombre categoriaNombre origenNombre personajesNombre personajeNombre tiempoEstimado";

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

  const normalizedItems = cart.items.map((item) => ({
    producto: getItemProductId(item),
    cantidad: Number(item.cantidad || 1),
    precioReferencialUnitario: Number(item.precioReferencialUnitario || 0)
  }));

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

    const productPrice = getProductPrice(product);

    const existingItem = cart.items.find(
      (item) => item.producto.toString() === producto
    );

    if (existingItem) {
      existingItem.precioReferencialUnitario = productPrice;

      if (requiresConfirmation) {
        existingItem.cantidad = 1;
      } else {
        existingItem.cantidad += safeQuantity;
      }
    } else {
      cart.items.push({
        producto,
        cantidad: safeQuantity,
        precioReferencialUnitario: productPrice
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

    const requiresConfirmation = isAvailabilityByConfirmation(product);

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

    const item = cart.items.find(
      (cartItem) => cartItem.producto.toString() === producto
    );

    if (!item) {
      return res.status(404).json({
        message: "Producto no encontrado dentro de la lista"
      });
    }

    item.precioReferencialUnitario = getProductPrice(product);
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

    cart.items = cart.items.filter(
      (item) => item.producto.toString() !== producto
    );

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