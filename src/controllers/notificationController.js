const Notification = require("../models/Notification");
const UserPreference = require("../models/UserPreference");
const { emitSocketEvent } = require("../utils/socketHelper");

const getCurrentUserId = (req) => {
  return req.user._id || req.user.id;
};

const buildUserNotificationFilter = async (userId) => {
  const preferences = await UserPreference.findOne({
    usuario: userId,
    activo: true,
    recibirNotificaciones: true
  });

  const conditions = [
    {
      destinatarioTipo: "todos"
    },
    {
      destinatarioTipo: "usuarios_especificos",
      usuarios: userId
    },
    {
      destinatarioTipo: "por_pedido",
      usuarios: userId
    }
  ];

  if (preferences) {
    if (preferences.seriesFavoritas.length > 0) {
      conditions.push({
        destinatarioTipo: "por_preferencias",
        serie: { $in: preferences.seriesFavoritas }
      });
    }

    if (preferences.categoriasFavoritas.length > 0) {
      conditions.push({
        destinatarioTipo: "por_preferencias",
        categoria: { $in: preferences.categoriasFavoritas }
      });
    }

    if (preferences.productosFavoritos.length > 0) {
      conditions.push({
        destinatarioTipo: "por_preferencias",
        producto: { $in: preferences.productosFavoritos }
      });
    }

    if (preferences.listaDeseos.length > 0) {
      conditions.push({
        destinatarioTipo: "por_lista_deseos",
        producto: { $in: preferences.listaDeseos }
      });
    }
  }

  return {
    activa: true,
    $or: conditions
  };
};

const getMyNotifications = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const filter = await buildUserNotificationFilter(userId);

    const notifications = await Notification.find(filter)
      .populate("producto", "nombre slug imagenes stock disponibilidad precioReferencial")
      .populate("serie", "nombre slug imagen")
      .populate("categoria", "nombre slug tipo")
      .populate("evento", "titulo slug fechaInicio fechaFin estado")
      .populate({
        path: "pedido",
        select:
          "cliente totalReferencial montoPagado saldoPendiente estadoPago estadoPedido envio createdAt",
        populate: {
          path: "items.producto",
          select: "nombre slug imagenes precioReferencial"
        }
      })
      .sort({ createdAt: -1 });

    const notificationsWithReadStatus = notifications.map((notification) => {
      const notificationObject = notification.toObject();

      notificationObject.leida = notification.leidaPor.some((item) => {
        return item.usuario.toString() === userId.toString();
      });

      return notificationObject;
    });

    res.json({
      message: "Notificaciones obtenidas correctamente",
      total: notificationsWithReadStatus.length,
      notifications: notificationsWithReadStatus
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener notificaciones",
      error: error.message
    });
  }
};

const createNotification = async (req, res) => {
  try {
    const {
      titulo,
      mensaje,
      tipo,
      destinatarioTipo,
      usuarios,
      producto,
      serie,
      categoria,
      evento,
      pedido
    } = req.body;

    const notification = await Notification.create({
      titulo,
      mensaje,
      tipo,
      destinatarioTipo,
      usuarios: usuarios || [],
      producto: producto || null,
      serie: serie || null,
      categoria: categoria || null,
      evento: evento || null,
      pedido: pedido || null,
      creadaPor: getCurrentUserId(req)
    });

    emitSocketEvent(req, "notification_created", {
      message: "Nueva notificación creada",
      notification
    });

    res.status(201).json({
      message: "Notificación creada correctamente",
      notification
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear notificación",
      error: error.message
    });
  }
};

const getNotificationsForAdmin = async (req, res) => {
  try {
    const { tipo, destinatarioTipo, activos } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activa = true;
    }

    if (tipo) {
      filter.tipo = tipo;
    }

    if (destinatarioTipo) {
      filter.destinatarioTipo = destinatarioTipo;
    }

    const notifications = await Notification.find(filter)
      .populate("usuarios", "nombre apellido alias email telefono")
      .populate("producto", "nombre slug stock disponibilidad precioReferencial")
      .populate("serie", "nombre slug")
      .populate("categoria", "nombre slug tipo")
      .populate("evento", "titulo slug fechaInicio fechaFin estado")
      .populate(
        "pedido",
        "cliente totalReferencial montoPagado saldoPendiente estadoPago estadoPedido envio"
      )
      .populate("creadaPor", "nombre apellido email")
      .sort({ createdAt: -1 });

    res.json({
      message: "Lista de notificaciones obtenida correctamente",
      total: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener notificaciones del administrador",
      error: error.message
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      activa: true
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notificación no encontrada"
      });
    }

    const alreadyRead = notification.leidaPor.some((item) => {
      return item.usuario.toString() === userId.toString();
    });

    if (!alreadyRead) {
      notification.leidaPor.push({
        usuario: userId,
        fechaLectura: new Date()
      });

      await notification.save();
    }

    res.json({
      message: "Notificación marcada como leída",
      notification
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al marcar notificación como leída",
      error: error.message
    });
  }
};

const markAllMyNotificationsAsRead = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const filter = await buildUserNotificationFilter(userId);

    const notifications = await Notification.find(filter);

    for (const notification of notifications) {
      const alreadyRead = notification.leidaPor.some((item) => {
        return item.usuario.toString() === userId.toString();
      });

      if (!alreadyRead) {
        notification.leidaPor.push({
          usuario: userId,
          fechaLectura: new Date()
        });

        await notification.save();
      }
    }

    res.json({
      message: "Todas las notificaciones fueron marcadas como leídas"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al marcar todas las notificaciones como leídas",
      error: error.message
    });
  }
};

const deactivateNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        message: "Notificación no encontrada"
      });
    }

    notification.activa = false;
    await notification.save();

    res.json({
      message: "Notificación desactivada correctamente"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar notificación",
      error: error.message
    });
  }
};

module.exports = {
  getMyNotifications,
  createNotification,
  getNotificationsForAdmin,
  markNotificationAsRead,
  markAllMyNotificationsAsRead,
  deactivateNotification
};