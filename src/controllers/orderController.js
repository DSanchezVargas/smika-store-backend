const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
const Notification = require("../models/Notification");

const { generateWhatsAppLink } = require("../services/whatsappService");
const { emitSocketEvent } = require("../utils/socketHelper");
const { normalizePhoneData } = require("../utils/phoneHelper");

const buildOrderItemsFromCart = (cart) => {
  return cart.items.map((item) => {
    const product = item.producto;

    return {
      producto: product._id,
      nombreProducto: product.nombre,
      cantidad: item.cantidad,
      precioReferencialUnitario: item.precioReferencialUnitario,
      subtotalReferencial: item.cantidad * item.precioReferencialUnitario
    };
  });
};

const calculateOrderTotal = (items) => {
  return items.reduce((total, item) => {
    return total + item.subtotalReferencial;
  }, 0);
};

const calculateSaldoPendiente = (totalReferencial, montoPagado) => {
  const saldo = totalReferencial - montoPagado;
  return saldo < 0 ? 0 : saldo;
};

const detectEstadoPago = (totalReferencial, montoPagado, estadoPagoManual) => {
  if (estadoPagoManual) {
    return estadoPagoManual;
  }

  if (!montoPagado || montoPagado === 0) {
    return "sin_pago";
  }

  if (montoPagado >= totalReferencial) {
    return "pago_completo";
  }

  return "adelanto";
};

const buildClienteData = async (usuarioId, clienteBody = {}) => {
  let clienteFinal = {
    nombre: clienteBody?.nombre || "",
    apellido: clienteBody?.apellido || "",
    alias: clienteBody?.alias || "",
    pais: clienteBody?.pais || "PE",
    codigoPais: clienteBody?.codigoPais || "+51",
    telefono: clienteBody?.telefono || "",
    email: clienteBody?.email || ""
  };

  if (usuarioId) {
    const user = await User.findById(usuarioId);

    if (user) {
      clienteFinal = {
        nombre: clienteBody?.nombre || user.nombre,
        apellido: clienteBody?.apellido || user.apellido,
        alias: clienteBody?.alias || user.alias,
        pais: clienteBody?.pais || user.pais,
        codigoPais: clienteBody?.codigoPais || user.codigoPais,
        telefono: clienteBody?.telefono || user.telefono,
        email: clienteBody?.email || user.email
      };
    }
  }

  const phoneData = normalizePhoneData({
    pais: clienteFinal.pais,
    codigoPais: clienteFinal.codigoPais,
    telefono: clienteFinal.telefono
  });

  return {
    ...clienteFinal,
    pais: phoneData.pais,
    codigoPais: phoneData.codigoPais,
    telefono: phoneData.telefono,
    telefonoCompleto: phoneData.telefonoCompleto
  };
};

const getOrderNotificationType = (order) => {
  if (order.estadoPedido === "entregado") {
    return "pedido_entregado";
  }

  if (order.envio?.numeroTracking) {
    return "tracking_disponible";
  }

  if (order.estadoPedido === "enviado" || order.estadoPedido === "en_courier") {
    return "pedido_enviado";
  }

  if (
    order.estadoPedido === "en_preparacion" ||
    order.estadoPedido === "empaquetado" ||
    order.estadoPedido === "listo_para_entrega"
  ) {
    return "pedido_empaquetado";
  }

  if (
    order.estadoPedido === "separado" ||
    order.estadoPedido === "cotizado" ||
    order.estadoPedido === "confirmado"
  ) {
    return "pedido_confirmado";
  }

  if (
    order.estadoPago === "sin_pago" ||
    order.estadoPago === "adelanto" ||
    order.estadoPago === "cuotas"
  ) {
    return "pago_pendiente";
  }

  return "pedido_actualizado";
};

const createOrderUpdateNotification = async (req, order) => {
  if (!order.usuario) {
    return null;
  }

  const notificationType = getOrderNotificationType(order);

  let titulo = "Actualización de tu pedido";
  let mensaje = `Tu pedido fue actualizado. Estado actual: ${order.estadoPedido}.`;

  if (notificationType === "pago_pendiente") {
    titulo = "Pago pendiente de tu pedido";
    mensaje = `Tu pedido tiene un saldo pendiente de S/ ${order.saldoPendiente}.`;
  }

  if (notificationType === "pedido_confirmado") {
    titulo = "Tu pedido fue confirmado";
    mensaje = "Tu pedido ya fue revisado por Smika Store y está en seguimiento.";
  }

  if (notificationType === "pedido_empaquetado") {
    titulo = "Tu pedido está en preparación";
    mensaje = "Tu pedido está siendo preparado para su entrega.";
  }

  if (notificationType === "pedido_enviado") {
    titulo = "Tu pedido fue enviado";
    mensaje = `Tu pedido fue enviado${
      order.envio?.courier ? ` por ${order.envio.courier}` : ""
    }.`;
  }

  if (notificationType === "tracking_disponible") {
    titulo = "Tracking disponible";
    mensaje = `Tu pedido ya tiene número de tracking: ${order.envio.numeroTracking}.`;
  }

  if (notificationType === "pedido_entregado") {
    titulo = "Tu pedido fue entregado";
    mensaje = "Tu pedido figura como entregado. Gracias por comprar en Smika Store.";
  }

  const notification = await Notification.create({
    titulo,
    mensaje,
    tipo: notificationType,
    destinatarioTipo: "por_pedido",
    usuarios: [order.usuario],
    pedido: order._id,
    creadaPor: req.user?._id || req.user?.id || null
  });

  emitSocketEvent(req, "notification_created", {
    message: "Notificación de pedido creada",
    notification
  });

  return notification;
};

const createOrderFromCart = async (req, res) => {
  try {
    const {
      sessionId,
      usuario,
      cliente,
      observaciones,
      montoPagado = 0,
      estadoPago
    } = req.body;

    const cart = await Cart.findOne({
      sessionId,
      estado: "activo"
    }).populate("items.producto", "nombre precioReferencial activo");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        message: "La lista de pedido está vacía"
      });
    }

    const hasInvalidProduct = cart.items.some((item) => {
      return !item.producto || !item.producto.activo;
    });

    if (hasInvalidProduct) {
      return res.status(400).json({
        message: "La lista contiene productos no disponibles"
      });
    }

    const orderItems = buildOrderItemsFromCart(cart);
    const totalReferencial = calculateOrderTotal(orderItems);
    const saldoPendiente = calculateSaldoPendiente(totalReferencial, montoPagado);

    const estadoPagoFinal = detectEstadoPago(
      totalReferencial,
      montoPagado,
      estadoPago
    );

    const clienteFinal = await buildClienteData(usuario, cliente);

    const order = await Order.create({
      usuario: usuario || null,
      cliente: clienteFinal,
      items: orderItems,
      totalReferencial,
      montoPagado,
      saldoPendiente,
      estadoPago: estadoPagoFinal,
      estadoPedido: "pendiente_whatsapp",
      observaciones
    });

    order.whatsappLink = generateWhatsAppLink(order);
    await order.save();

    cart.estado = "convertido_en_pedido";
    await cart.save();

    emitSocketEvent(req, "order_created", {
      message: "Nuevo pedido generado desde la lista",
      order
    });

    res.status(201).json({
      message: "Pedido generado correctamente",
      order
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al generar pedido",
      error: error.message
    });
  }
};

const createOrderDirect = async (req, res) => {
  try {
    const {
      usuario,
      cliente,
      items,
      observaciones,
      montoPagado = 0,
      estadoPago
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "El pedido debe tener al menos un producto"
      });
    }

    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.producto);

      if (!product || !product.activo) {
        return res.status(404).json({
          message: "Uno de los productos no existe o no está disponible"
        });
      }

      const cantidad = item.cantidad || 1;
      const precioReferencialUnitario = product.precioReferencial;

      orderItems.push({
        producto: product._id,
        nombreProducto: product.nombre,
        cantidad,
        precioReferencialUnitario,
        subtotalReferencial: cantidad * precioReferencialUnitario
      });
    }

    const totalReferencial = calculateOrderTotal(orderItems);
    const saldoPendiente = calculateSaldoPendiente(totalReferencial, montoPagado);

    const estadoPagoFinal = detectEstadoPago(
      totalReferencial,
      montoPagado,
      estadoPago
    );

    const clienteFinal = await buildClienteData(usuario, cliente);

    const order = await Order.create({
      usuario: usuario || null,
      cliente: clienteFinal,
      items: orderItems,
      totalReferencial,
      montoPagado,
      saldoPendiente,
      estadoPago: estadoPagoFinal,
      estadoPedido: "pendiente_whatsapp",
      observaciones
    });

    order.whatsappLink = generateWhatsAppLink(order);
    await order.save();

    emitSocketEvent(req, "order_created", {
      message: "Nuevo pedido generado directamente",
      order
    });

    res.status(201).json({
      message: "Pedido generado correctamente",
      order
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al generar pedido directo",
      error: error.message
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const { estadoPedido, estadoPago, search, usuario } = req.query;

    const filter = {};

    if (estadoPedido) {
      filter.estadoPedido = estadoPedido;
    }

    if (estadoPago) {
      filter.estadoPago = estadoPago;
    }

    if (usuario) {
      filter.usuario = usuario;
    }

    if (search) {
      filter.$or = [
        { "cliente.nombre": { $regex: search, $options: "i" } },
        { "cliente.apellido": { $regex: search, $options: "i" } },
        { "cliente.alias": { $regex: search, $options: "i" } },
        { "cliente.telefono": { $regex: search, $options: "i" } },
        { "cliente.telefonoCompleto": { $regex: search, $options: "i" } },
        { "cliente.email": { $regex: search, $options: "i" } }
      ];
    }

    const orders = await Order.find(filter)
      .populate("usuario", "nombre apellido alias pais codigoPais telefono telefonoCompleto email")
      .populate("items.producto", "nombre slug imagenes precioReferencial")
      .sort({ createdAt: -1 });

    res.json({
      message: "Lista de pedidos obtenida correctamente",
      total: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener pedidos",
      error: error.message
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("usuario", "nombre apellido alias pais codigoPais telefono telefonoCompleto email")
      .populate("items.producto", "nombre slug imagenes precioReferencial");

    if (!order) {
      return res.status(404).json({
        message: "Pedido no encontrado"
      });
    }

    res.json({
      message: "Pedido obtenido correctamente",
      order
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener pedido",
      error: error.message
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const orders = await Order.find({ usuario: userId })
      .populate("items.producto", "nombre slug imagenes precioReferencial")
      .sort({ createdAt: -1 });

    res.json({
      message: "Mis pedidos obtenidos correctamente",
      total: orders.length,
      orders
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener mis pedidos",
      error: error.message
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const {
      montoPagado,
      estadoPago,
      estadoPedido,
      observaciones,
      notasAdmin,
      envio
    } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Pedido no encontrado"
      });
    }

    if (montoPagado !== undefined) {
      order.montoPagado = montoPagado;
      order.saldoPendiente = calculateSaldoPendiente(
        order.totalReferencial,
        montoPagado
      );
      order.estadoPago = detectEstadoPago(
        order.totalReferencial,
        montoPagado,
        estadoPago
      );
    }

    if (estadoPago !== undefined && montoPagado === undefined) {
      order.estadoPago = estadoPago;
    }

    if (estadoPedido !== undefined) {
      order.estadoPedido = estadoPedido;
    }

    if (observaciones !== undefined) {
      order.observaciones = observaciones;
    }

    if (notasAdmin !== undefined) {
      order.notasAdmin = notasAdmin;
    }

    if (envio !== undefined) {
      if (envio.courier !== undefined) order.envio.courier = envio.courier;
      if (envio.numeroTracking !== undefined) {
        order.envio.numeroTracking = envio.numeroTracking;
      }
      if (envio.trackingUrl !== undefined) {
        order.envio.trackingUrl = envio.trackingUrl;
      }
      if (envio.fechaEnvio !== undefined) {
        order.envio.fechaEnvio = envio.fechaEnvio || null;
      }
      if (envio.fechaEntregaEstimada !== undefined) {
        order.envio.fechaEntregaEstimada = envio.fechaEntregaEstimada || null;
      }
      if (envio.direccionEntrega !== undefined) {
        order.envio.direccionEntrega = envio.direccionEntrega;
      }
    }

    await order.save();

    await createOrderUpdateNotification(req, order);

    emitSocketEvent(req, "order_status_updated", {
      message: "Estado del pedido actualizado",
      order
    });

    res.json({
      message: "Pedido actualizado correctamente",
      order
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar pedido",
      error: error.message
    });
  }
};

module.exports = {
  createOrderFromCart,
  createOrderDirect,
  getOrders,
  getOrderById,
  getMyOrders,
  updateOrderStatus
};