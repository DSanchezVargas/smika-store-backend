const Cart = require("../models/Cart");
const Product = require("../models/Product");

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "51936649135";

const PRODUCT_POPULATE_FIELDS =
  "nombre slug precioReferencial precio price imagenes disponibilidad stock estado activo serie serieNombre tipoProducto evento eventoNombre categoriaNombre origenNombre personajesNombre personajeNombre tiempoEstimado";

const isAvailabilityByConfirmation = (product) => {
  const stock = Number(product?.stock || 0);
  const tiempoEstimado = (product?.tiempoEstimado || "").trim();

  return stock <= 0 && Boolean(tiempoEstimado);
};

const getAvailabilityText = (product) => {
  const tiempoEstimado = (product?.tiempoEstimado || "").trim();

  if (tiempoEstimado) return tiempoEstimado;

  return "Disponibilidad por confirmar con Smika Store 💖";
};

const calculateCartTotal = (items = []) => {
  return items.reduce((total, item) => {
    return (
      total +
      Number(item.cantidad || 1) *
        Number(item.precioReferencialUnitario || 0)
    );
  }, 0);
};

const getProductPrice = (product) => {
  return Number(
    product?.precioReferencial || product?.precio || product?.price || 0
  );
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

const getOrCreateUserCart = async (userId) => {
  let cart = await findActiveCartByUser(userId);

  if (!cart) {
    await Cart.create({
      usuario: userId,
      sessionId: "",
      items: [],
      totalReferencial: 0,
      estado: "activo"
    });

    cart = await findActiveCartByUser(userId);
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

    const safeQuantity = Math.max(1, Number(cantidad || 1));
    const productPrice = getProductPrice(product);

    const existingItem = cart.items.find(
      (item) => item.producto.toString() === producto
    );

    if (existingItem) {
      existingItem.cantidad += safeQuantity;
      existingItem.precioReferencialUnitario = productPrice;
    } else {
      cart.items.push({
        producto,
        cantidad: safeQuantity,
        precioReferencialUnitario: productPrice
      });
    }

    cart.totalReferencial = calculateCartTotal(cart.items);

    await cart.save();

    const updatedCart = await findActiveCartByUser(userId);

    res.status(201).json({
      message: "Producto agregado a la lista correctamente",
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

    if (!producto || Number(cantidad) < 1) {
      return res.status(400).json({
        message: "Debe enviar un producto válido y una cantidad mayor a 0"
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

    item.cantidad = Math.max(1, Number(cantidad));
    cart.totalReferencial = calculateCartTotal(cart.items);

    await cart.save();

    const updatedCart = await findActiveCartByUser(userId);

    res.json({
      message: "Cantidad actualizada correctamente",
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

    cart.totalReferencial = calculateCartTotal(cart.items);

    await cart.save();

    const updatedCart = await findActiveCartByUser(userId);

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

    const updatedCart = await findActiveCartByUser(userId);

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
    const cart = await findActiveCartByUser(userId);

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
            : product?.disponibilidad
            ? `   Disponibilidad: ${product.disponibilidad.replace("_", " ")}`
            : "",
          requiresConfirmation
            ? "   Cantidad: Consultar disponibilidad"
            : `   Cantidad: ${cantidad}`,
          `   Precio referencial: S/ ${precio}`,
          requiresConfirmation
            ? `   Subtotal referencial: S/ ${precio}`
            : `   Subtotal: S/ ${subtotal}`
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
      `Total referencial: S/ ${cart.totalReferencial}`,
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