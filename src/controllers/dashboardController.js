const User = require("../models/User");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Series = require("../models/Series");
const Event = require("../models/Event");
const Order = require("../models/Order");
const Character = require("../models/Character");
const Creator = require("../models/Creator");
const Origin = require("../models/Origin");
const Notification = require("../models/Notification");

const getDashboardSummary = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalCategories,
      totalSeries,
      totalEvents,
      totalOrders,
      totalCharacters,
      totalCreators,
      totalOrigins,
      totalNotifications,

      pendingWhatsappOrders,
      quotedOrders,
      separatedOrders,
      confirmedOrders,
      preparationOrders,
      packedOrders,
      readyToDeliverOrders,
      shippedOrders,
      courierOrders,
      deliveredOrders,
      cancelledOrders,

      noPaymentOrders,
      advancePaymentOrders,
      installmentPaymentOrders,
      fullPaymentOrders,

      activeEvents,
      upcomingEvents,
      featuredProducts,
      newProducts,
      lowStockProducts,
      soldOutProducts
    ] = await Promise.all([
      User.countDocuments({ activo: true }),
      Product.countDocuments({ activo: true }),
      Category.countDocuments({ activa: true }),
      Series.countDocuments({ activa: true }),
      Event.countDocuments({ activo: true }),
      Order.countDocuments(),
      Character.countDocuments({ activo: true }),
      Creator.countDocuments({ activo: true }),
      Origin.countDocuments({ activo: true }),
      Notification.countDocuments({ activa: true }),

      Order.countDocuments({ estadoPedido: "pendiente_whatsapp" }),
      Order.countDocuments({ estadoPedido: "cotizado" }),
      Order.countDocuments({ estadoPedido: "separado" }),
      Order.countDocuments({ estadoPedido: "confirmado" }),
      Order.countDocuments({ estadoPedido: "en_preparacion" }),
      Order.countDocuments({ estadoPedido: "empaquetado" }),
      Order.countDocuments({ estadoPedido: "listo_para_entrega" }),
      Order.countDocuments({ estadoPedido: "enviado" }),
      Order.countDocuments({ estadoPedido: "en_courier" }),
      Order.countDocuments({ estadoPedido: "entregado" }),
      Order.countDocuments({ estadoPedido: "cancelado" }),

      Order.countDocuments({ estadoPago: "sin_pago" }),
      Order.countDocuments({ estadoPago: "adelanto" }),
      Order.countDocuments({ estadoPago: "cuotas" }),
      Order.countDocuments({ estadoPago: "pago_completo" }),

      Event.countDocuments({ activo: true, estado: "activo" }),
      Event.countDocuments({ activo: true, estado: "proximo" }),
      Product.countDocuments({ activo: true, esDestacado: true }),
      Product.countDocuments({ activo: true, esNuevo: true }),
      Product.countDocuments({ activo: true, stock: { $gt: 0, $lte: 5 } }),
      Product.countDocuments({
        activo: true,
        $or: [{ stock: 0 }, { disponibilidad: "agotado" }]
      })
    ]);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "cliente totalReferencial montoPagado saldoPendiente estadoPago estadoPedido envio createdAt"
      );

    const recentProducts = await Product.find({ activo: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "nombre precioReferencial disponibilidad stock esNuevo esDestacado createdAt"
      );

    const recentNotifications = await Notification.find({ activa: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("titulo mensaje tipo destinatarioTipo createdAt");

    res.json({
      message: "Resumen del dashboard obtenido correctamente",
      summary: {
        totals: {
          totalUsers,
          totalProducts,
          totalCategories,
          totalSeries,
          totalEvents,
          totalOrders,
          totalCharacters,
          totalCreators,
          totalOrigins,
          totalNotifications
        },

        orders: {
          pendingWhatsappOrders,
          quotedOrders,
          separatedOrders,
          confirmedOrders,
          preparationOrders,
          packedOrders,
          readyToDeliverOrders,
          shippedOrders,
          courierOrders,
          deliveredOrders,
          cancelledOrders
        },

        payments: {
          noPaymentOrders,
          advancePaymentOrders,
          installmentPaymentOrders,
          fullPaymentOrders
        },

        products: {
          featuredProducts,
          newProducts,
          lowStockProducts,
          soldOutProducts
        },

        events: {
          activeEvents,
          upcomingEvents
        }
      },
      recentOrders,
      recentProducts,
      recentNotifications
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener resumen del dashboard",
      error: error.message
    });
  }
};

module.exports = {
  getDashboardSummary
};