const mongoose = require("mongoose");

const Event = require("../models/Event");
const Series = require("../models/Series");
const { createSlug } = require("../utils/slugHelper");
const { emitSocketEvent } = require("../utils/socketHelper");

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

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const populateEvent = (query) => {
  return query
    .populate("categoria", "nombre slug")
    .populate({
      path: "serie",
      select: "nombre slug creadores",
      populate: {
        path: "creadores",
        select: "nombre slug tipo"
      }
    })
    .populate("origen", "nombre slug code")
    .populate("productos", "nombre slug precioReferencial imagenes activo");
};

const normalizeEventResponse = (event) => {
  const plainEvent = event?.toObject ? event.toObject() : event;

  if (!plainEvent) return null;

  return {
    ...plainEvent,
    id: plainEvent._id,
    _id: plainEvent._id,

    nombre: plainEvent.titulo,
    titulo: plainEvent.titulo,

    categoriaNombre:
      plainEvent.categoria?.nombre || plainEvent.categoriaNombre || "Eventos",

    serieNombre:
      plainEvent.serie?.nombre || plainEvent.serieNombre || "",

    origenNombre:
      plainEvent.origen?.nombre || plainEvent.origenNombre || "Variado",

    pais: plainEvent.pais || "V",
    activo: plainEvent.activo !== false
  };
};

const resolveSerieData = async (serieValue, serieNombreValue = "") => {
  if (isValidObjectId(serieValue)) {
    const serie = await Series.findById(serieValue);

    return {
      serie: serie?._id || serieValue,
      serieNombre: serieNombreValue || serie?.nombre || ""
    };
  }

  return {
    serie: null,
    serieNombre: getTextValue(serieNombreValue, serieValue)
  };
};

const buildEventPayload = async (body = {}) => {
  const categoriaValue = body.categoria || body.categoriaPrincipal || "";
  const origenValue = body.origen || body.pais || "";
  const serieData = await resolveSerieData(body.serie, body.serieNombre);

  return {
    titulo: getTextValue(body.titulo, body.nombre, body.name),
    descripcion: getTextValue(body.descripcion, body.description),
    imagen: getTextValue(body.imagen, body.image),

    imagenes: Array.isArray(body.imagenes)
      ? body.imagenes.filter(Boolean)
      : [],

    categoria: getOptionalObjectId(categoriaValue),
    categoriaNombre: getTextValue(
      body.categoriaNombre,
      isValidObjectId(categoriaValue) ? "" : categoriaValue,
      "Eventos"
    ),

    serie: serieData.serie,
    serieNombre: serieData.serieNombre,

    origen: getOptionalObjectId(origenValue),
    origenNombre: getTextValue(
      body.origenNombre,
      body.paisNombre,
      isValidObjectId(origenValue) ? "" : origenValue,
      "Variado"
    ),

    pais: getTextValue(body.pais, body.countryCode, "V"),

    tipoEvento: getTextValue(body.tipoEvento, body.tipo, "Otro"),

    fechaInicio: normalizeDate(body.fechaInicio),
    fechaFin: normalizeDate(body.fechaFin),

    estado: getTextValue(body.estado, "proximo"),

    destacado: Boolean(body.destacado),

    productos: Array.isArray(body.productos)
      ? body.productos.filter(isValidObjectId)
      : [],

    activo:
      body.activo !== undefined
        ? Boolean(body.activo)
        : true
  };
};

const getEvents = async (req, res) => {
  try {
    const {
      search,
      categoria,
      serie,
      origen,
      estado,
      destacados,
      activos
    } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activo = true;
    }

    if (search) {
      filter.$or = [
        { titulo: { $regex: search, $options: "i" } },
        { descripcion: { $regex: search, $options: "i" } }
      ];
    }

    if (categoria) {
      if (isValidObjectId(categoria)) {
        filter.categoria = categoria;
      } else {
        filter.categoriaNombre = { $regex: categoria, $options: "i" };
      }
    }

    if (serie) {
      if (isValidObjectId(serie)) {
        filter.serie = serie;
      } else {
        filter.serieNombre = { $regex: serie, $options: "i" };
      }
    }

    if (origen) {
      if (isValidObjectId(origen)) {
        filter.origen = origen;
      } else {
        filter.origenNombre = { $regex: origen, $options: "i" };
      }
    }

    if (estado) filter.estado = estado;
    if (destacados !== undefined) filter.destacado = destacados === "true";

    const events = await populateEvent(
      Event.find(filter).sort({ fechaInicio: 1, createdAt: -1 })
    );

    res.json({
      message: "Lista de eventos obtenida correctamente",
      total: events.length,
      events: events.map(normalizeEventResponse)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener eventos",
      error: error.message
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const query = isValidObjectId(req.params.id)
      ? { _id: req.params.id }
      : { slug: req.params.id };

    const event = await populateEvent(Event.findOne(query));

    if (!event) {
      return res.status(404).json({
        message: "Evento no encontrado"
      });
    }

    res.json({
      message: "Evento obtenido correctamente",
      event: normalizeEventResponse(event)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener evento",
      error: error.message
    });
  }
};

const createEvent = async (req, res) => {
  try {
    const payload = await buildEventPayload(req.body);

    if (!payload.titulo) {
      return res.status(400).json({
        message: "El título del evento es obligatorio"
      });
    }

    const slug = createSlug(payload.titulo);

    const eventExists = await Event.findOne({ slug });

    if (eventExists) {
      return res.status(400).json({
        message: "Este evento ya existe"
      });
    }

    const event = await Event.create({
      ...payload,
      slug
    });

    emitSocketEvent(req, "event_created", {
      message: "Nuevo evento creado",
      event
    });

    const populatedEvent = await populateEvent(Event.findById(event._id));

    res.status(201).json({
      message: "Evento creado correctamente",
      event: normalizeEventResponse(populatedEvent)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear evento",
      error: error.message
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const payload = await buildEventPayload(req.body);

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Evento no encontrado"
      });
    }

    if (payload.titulo) {
      const slug = createSlug(payload.titulo);

      const duplicatedEvent = await Event.findOne({
        slug,
        _id: { $ne: event._id }
      });

      if (duplicatedEvent) {
        return res.status(400).json({
          message: "Ya existe otro evento con ese título"
        });
      }

      event.titulo = payload.titulo;
      event.slug = slug;
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (key !== "titulo" && value !== undefined) {
        event[key] = value;
      }
    });

    await event.save();

    emitSocketEvent(req, "event_updated", {
      message: "Evento actualizado",
      event
    });

    const populatedEvent = await populateEvent(Event.findById(event._id));

    res.json({
      message: "Evento actualizado correctamente",
      event: normalizeEventResponse(populatedEvent)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar evento",
      error: error.message
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Evento no encontrado"
      });
    }

    event.activo = false;
    await event.save();

    emitSocketEvent(req, "event_deleted", {
      message: "Evento desactivado",
      eventId: event._id
    });

    res.json({
      message: "Evento desactivado correctamente",
      event: normalizeEventResponse(event)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al desactivar evento",
      error: error.message
    });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};