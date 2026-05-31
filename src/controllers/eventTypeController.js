const EventType = require("../models/EventType");
const Event = require("../models/Event");
const { createSlug } = require("../utils/slugHelper");
const { emitSocketEvent } = require("../utils/socketHelper");

const DEFAULT_EVENT_TYPES = [
  "Lebom",
  "Café",
  "Fantazit",
  "Preventa",
  "Evento actual",
  "Evento próximo",
  "Pop up",
  "Campaña",
  "Colaboración",
  "Otro"
];

const getTextValue = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return found ? found.toString().trim() : "";
};

const normalizeEventTypePayload = (body = {}) => {
  const nombre = getTextValue(body.nombre, body.name, body.tipoEvento, body.tipo);

  return {
    nombre,
    slug: createSlug(nombre),
    descripcion: getTextValue(body.descripcion, body.description),
    orden: Number(body.orden || 0),
    esDefault: Boolean(body.esDefault),
    activo: body.activo !== undefined ? Boolean(body.activo) : true
  };
};

const normalizeEventTypeResponse = (eventType) => {
  if (!eventType) return null;

  const plainEventType =
    typeof eventType.toObject === "function" ? eventType.toObject() : eventType;

  return {
    ...plainEventType,
    id: plainEventType._id,
    nombre: plainEventType.nombre,
    value: plainEventType.nombre,
    label: plainEventType.nombre
  };
};

const ensureDefaultEventTypes = async () => {
  const createdOrFound = [];

  for (const name of DEFAULT_EVENT_TYPES) {
    const slug = createSlug(name);

    let eventType = await EventType.findOne({ slug });

    if (!eventType) {
      eventType = await EventType.create({
        nombre: name,
        slug,
        descripcion: "Tipo de evento base de Smika Store.",
        orden: createdOrFound.length,
        esDefault: true,
        activo: true
      });
    }

    createdOrFound.push(eventType);
  }

  return createdOrFound;
};

const getEventTypes = async (req, res) => {
  try {
    await ensureDefaultEventTypes();

    const { search, activos } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activo = true;
    }

    if (search) {
      filter.nombre = {
        $regex: search,
        $options: "i"
      };
    }

    const eventTypes = await EventType.find(filter).sort({
      orden: 1,
      nombre: 1
    });

    res.json({
      message: "Tipos de evento obtenidos correctamente",
      total: eventTypes.length,
      eventTypes: eventTypes.map(normalizeEventTypeResponse),
      tiposEvento: eventTypes.map(normalizeEventTypeResponse)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener tipos de evento",
      error: error.message
    });
  }
};

const getEventTypeById = async (req, res) => {
  try {
    const eventType = await EventType.findById(req.params.id);

    if (!eventType) {
      return res.status(404).json({
        message: "Tipo de evento no encontrado"
      });
    }

    res.json({
      message: "Tipo de evento obtenido correctamente",
      eventType: normalizeEventTypeResponse(eventType),
      tipoEvento: normalizeEventTypeResponse(eventType)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener tipo de evento",
      error: error.message
    });
  }
};

const createEventType = async (req, res) => {
  try {
    const payload = normalizeEventTypePayload(req.body);

    if (!payload.nombre) {
      return res.status(400).json({
        message: "El nombre del tipo de evento es obligatorio"
      });
    }

    const duplicatedEventType = await EventType.findOne({
      $or: [
        { slug: payload.slug },
        { nombre: { $regex: `^${payload.nombre}$`, $options: "i" } }
      ]
    });

    if (duplicatedEventType) {
      return res.status(400).json({
        message: "Este tipo de evento ya existe",
        eventType: normalizeEventTypeResponse(duplicatedEventType),
        tipoEvento: normalizeEventTypeResponse(duplicatedEventType)
      });
    }

    const eventType = await EventType.create(payload);

    emitSocketEvent(req, "event_type_created", {
      message: "Tipo de evento creado",
      eventType
    });

    res.status(201).json({
      message: "Tipo de evento creado correctamente",
      eventType: normalizeEventTypeResponse(eventType),
      tipoEvento: normalizeEventTypeResponse(eventType)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear tipo de evento",
      error: error.message
    });
  }
};

const updateEventType = async (req, res) => {
  try {
    const payload = normalizeEventTypePayload(req.body);

    const eventType = await EventType.findById(req.params.id);

    if (!eventType) {
      return res.status(404).json({
        message: "Tipo de evento no encontrado"
      });
    }

    if (payload.nombre) {
      const duplicatedEventType = await EventType.findOne({
        slug: payload.slug,
        _id: { $ne: eventType._id }
      });

      if (duplicatedEventType) {
        return res.status(400).json({
          message: "Ya existe otro tipo de evento con ese nombre"
        });
      }

      eventType.nombre = payload.nombre;
      eventType.slug = payload.slug;
    }

    eventType.descripcion = payload.descripcion;
    eventType.orden = payload.orden;
    eventType.esDefault = payload.esDefault;
    eventType.activo = payload.activo;

    await eventType.save();

    emitSocketEvent(req, "event_type_updated", {
      message: "Tipo de evento actualizado",
      eventType
    });

    res.json({
      message: "Tipo de evento actualizado correctamente",
      eventType: normalizeEventTypeResponse(eventType),
      tipoEvento: normalizeEventTypeResponse(eventType)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar tipo de evento",
      error: error.message
    });
  }
};

const deleteEventType = async (req, res) => {
  try {
    const eventType = await EventType.findById(req.params.id);

    if (!eventType) {
      return res.status(404).json({
        message: "Tipo de evento no encontrado"
      });
    }

    eventType.activo = false;

    await eventType.save();

    emitSocketEvent(req, "event_type_deleted", {
      message: "Tipo de evento desactivado",
      eventTypeId: eventType._id
    });

    res.json({
      message: "Tipo de evento desactivado correctamente",
      eventType: normalizeEventTypeResponse(eventType),
      tipoEvento: normalizeEventTypeResponse(eventType)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar tipo de evento",
      error: error.message
    });
  }
};

const syncEventTypes = async (req, res) => {
  try {
    await ensureDefaultEventTypes();

    const events = await Event.find({}).select("tipoEvento tiposEvento tipo");

    const namesFromEvents = [];

    events.forEach((event) => {
      if (event.tipoEvento) namesFromEvents.push(event.tipoEvento);
      if (event.tipo) namesFromEvents.push(event.tipo);
      if (Array.isArray(event.tiposEvento)) namesFromEvents.push(...event.tiposEvento);
    });

    for (const rawName of namesFromEvents) {
      const nombre = getTextValue(rawName);

      if (!nombre) continue;

      const slug = createSlug(nombre);
      const exists = await EventType.findOne({ slug });

      if (!exists) {
        await EventType.create({
          nombre,
          slug,
          descripcion: "Tipo de evento sincronizado desde eventos existentes.",
          orden: 0,
          esDefault: false,
          activo: true
        });
      }
    }

    const eventTypes = await EventType.find({}).sort({
      orden: 1,
      nombre: 1
    });

    res.json({
      message: "Tipos de evento sincronizados correctamente",
      total: eventTypes.length,
      eventTypes: eventTypes.map(normalizeEventTypeResponse),
      tiposEvento: eventTypes.map(normalizeEventTypeResponse)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al sincronizar tipos de evento",
      error: error.message
    });
  }
};

module.exports = {
  getEventTypes,
  getEventTypeById,
  createEventType,
  updateEventType,
  deleteEventType,
  syncEventTypes
};
