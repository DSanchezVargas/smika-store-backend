const mongoose = require("mongoose");

const Event = require("../models/Event");
const Series = require("../models/Series");
const { createSlug } = require("../utils/slugHelper");
const { emitSocketEvent } = require("../utils/socketHelper");

const EVENT_STATES = ["proximo", "preventa", "activo", "finalizado", "cancelado"];

const isValidObjectId = (value) => {
  return value && mongoose.Types.ObjectId.isValid(value);
};

const isReadableSeriesName = (value = "") => {
  const cleanValue = getTextValue(value);

  if (!cleanValue) return false;

  return !isValidObjectId(cleanValue);
};

const getOptionalObjectId = (value) => {
  return isValidObjectId(value) ? value : null;
};

const getObjectIdValue = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;

  return value._id || value.id || "";
};

const getTextValue = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  if (Array.isArray(found)) return found.join(", ").trim();

  if (found && typeof found === "object") {
    return found.nombre || found.titulo || found.name || "";
  }

  return found ? found.toString().trim() : "";
};

const normalizeEventStatus = (value) => {
  const status = getTextValue(value, "proximo").toLowerCase();

  if (status === "actual") return "activo";

  if (EVENT_STATES.includes(status)) return status;

  return "proximo";
};

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getImageSource = (image) => {
  if (!image) return "";

  if (typeof image === "string") return image.trim();

  if (image && typeof image === "object") {
    return (
      image.finalPreview ||
      image.url ||
      image.preview ||
      image.src ||
      image.imagen ||
      ""
    ).trim();
  }

  return "";
};

const normalizeImages = (images = []) => {
  if (!Array.isArray(images)) return [];

  const seen = new Set();

  return images
    .map(getImageSource)
    .filter(Boolean)
    .filter((image) => {
      if (seen.has(image)) return false;

      seen.add(image);
      return true;
    });
};

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => getTextValue(item)).filter(Boolean);
  }

  const text = getTextValue(value);

  if (!text) return [];

  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const shouldReplaceImages = (body = {}, includeImages = false) => {
  if (includeImages) return true;

  return (
    body.imagenesTouched === true ||
    body.imagesTouched === true ||
    body.replaceImages === true ||
    body.reemplazarImagenes === true
  );
};

const populateEvent = (query) => {
  return query
    .populate("categoria", "nombre slug")
    .populate("serie", "nombre slug pais origenNombre")
    .populate("series", "nombre slug pais origenNombre")
    .populate("origen", "nombre slug code")
    .populate(
      "productos",
      "nombre slug precio precioReferencial tipo tipoProducto tiposProducto personajesNombre personajeNombre imagenes activo serieNombre eventoNombre"
    );
};

const getSeriesNames = (plainEvent) => {
  const names = [];

  if (Array.isArray(plainEvent.series)) {
    plainEvent.series.forEach((serie) => {
      const name = getTextValue(serie?.nombre, serie?.name);
      if (isReadableSeriesName(name)) names.push(name);
    });
  }

  if (Array.isArray(plainEvent.seriesNombre)) {
    names.push(...plainEvent.seriesNombre.filter(isReadableSeriesName));
  }

  const legacySerieName = getTextValue(
    plainEvent.serie?.nombre,
    plainEvent.serieNombre
  );

  if (isReadableSeriesName(legacySerieName)) names.push(legacySerieName);

  return [...new Set(names)];
};

const normalizeEventResponse = (event) => {
  const plainEvent = event?.toObject ? event.toObject() : event;

  if (!plainEvent) return null;

  const coverImage = getImageSource(plainEvent.imagen);

  const carouselImages = normalizeImages(plainEvent.imagenes).filter(
    (image) => image !== coverImage
  );

  const seriesNombre = getSeriesNames(plainEvent);

  return {
    ...plainEvent,

    id: plainEvent._id,
    _id: plainEvent._id,

    nombre: plainEvent.titulo,
    titulo: plainEvent.titulo,

    imagen: coverImage,
    imagenes: carouselImages,

    categoriaNombre:
      plainEvent.categoria?.nombre || plainEvent.categoriaNombre || "Eventos",

    serieNombre: seriesNombre[0] || "",
    seriesNombre,

    origenNombre:
      plainEvent.origen?.nombre || plainEvent.origenNombre || "Variado",

    pais: plainEvent.pais || "V",
    tipoEvento: plainEvent.tipoEvento || "Otro",
    activo: plainEvent.activo !== false
  };
};

const resolveSeriesData = async (body = {}) => {
  const rawSeriesIds = [];
  const rawSeriesNames = [];

  const collectSeriesValue = (value) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(collectSeriesValue);
      return;
    }

    if (value && typeof value === "object") {
      const possibleId = getObjectIdValue(value);

      if (isValidObjectId(possibleId)) {
        rawSeriesIds.push(possibleId);
      }

      const possibleName = getTextValue(
        value.nombre,
        value.titulo,
        value.name,
        value.serieNombre
      );

      if (isReadableSeriesName(possibleName)) {
        rawSeriesNames.push(possibleName);
      }

      return;
    }

    const text = getTextValue(value);

    if (!text) return;

    if (isValidObjectId(text)) {
      rawSeriesIds.push(text);
    } else if (isReadableSeriesName(text)) {
      rawSeriesNames.push(text);
    }
  };

  collectSeriesValue(body.series);
  collectSeriesValue(body.serie);

  rawSeriesNames.push(
    ...normalizeStringArray(body.seriesNombre).filter(isReadableSeriesName),
    ...normalizeStringArray(body.seriesTexto).filter(isReadableSeriesName),
    ...normalizeStringArray(body.seriesNames).filter(isReadableSeriesName),
    ...normalizeStringArray(body.serieNombre).filter(isReadableSeriesName)
  );

  const requestedSeriesIds = [...new Set(rawSeriesIds.filter(isValidObjectId))];

  const fetchedSeries = requestedSeriesIds.length
    ? await Series.find({
        _id: { $in: requestedSeriesIds },
        activa: { $ne: false },
        activo: { $ne: false },
        nombre: { $not: /^[a-f0-9]{24}$/i }
      }).select("nombre")
    : [];

  const existingSeriesIds = fetchedSeries.map((serie) => serie._id.toString());

  const fetchedNames = fetchedSeries
    .map((serie) => serie.nombre)
    .filter(isReadableSeriesName);

  const seriesNombre = [
    ...new Set([...fetchedNames, ...rawSeriesNames].filter(isReadableSeriesName))
  ];

  return {
    series: existingSeriesIds,
    seriesNombre,
    serie: existingSeriesIds[0] || null,
    serieNombre: seriesNombre[0] || ""
  };
};

const buildEventPayload = async (body = {}, options = {}) => {
  const categoriaValue = body.categoria || body.categoriaPrincipal || "";
  const origenValue = body.origen || "";

  const seriesData = await resolveSeriesData(body);

  const payload = {
    titulo: getTextValue(body.titulo, body.nombre, body.name),
    descripcion: getTextValue(body.descripcion, body.description),

    categoria: getOptionalObjectId(categoriaValue),
    categoriaNombre: getTextValue(
      body.categoriaNombre,
      isValidObjectId(categoriaValue) ? "" : categoriaValue,
      "Eventos"
    ),

    serie: seriesData.serie,
    serieNombre: seriesData.serieNombre,
    series: seriesData.series,
    seriesNombre: seriesData.seriesNombre,

    origen: getOptionalObjectId(origenValue),
    origenNombre: getTextValue(
      body.origenNombre,
      body.paisNombre,
      body.country,
      isValidObjectId(origenValue) ? "" : origenValue,
      "Variado"
    ),

    pais: getTextValue(body.pais, body.countryCode, body.origenNombre, "V"),

    tipoEvento: getTextValue(body.tipoEvento, body.tipo, "Otro"),

    fechaInicio: normalizeDate(body.fechaInicio),
    fechaFin: normalizeDate(body.fechaFin),

    estado: normalizeEventStatus(body.estado),

    destacado: Boolean(body.destacado),

    productos: Array.isArray(body.productos)
      ? body.productos.filter(isValidObjectId)
      : [],

    activo:
      body.activo !== undefined
        ? Boolean(body.activo)
        : true
  };

  if (shouldReplaceImages(body, options.includeImages === true)) {
    const coverImage = getImageSource(body.imagen || body.image);
    const carouselImages = normalizeImages(body.imagenes).filter(
      (image) => image !== coverImage
    );

    payload.imagen = coverImage;
    payload.imagenes = carouselImages;
  }

  return payload;
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
    const andConditions = [];

    if (activos !== "false") {
      filter.activo = true;
    }

    if (search) {
      andConditions.push({
        $or: [
          { titulo: { $regex: search, $options: "i" } },
          { descripcion: { $regex: search, $options: "i" } }
        ]
      });
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
        andConditions.push({
          $or: [{ serie }, { series: serie }]
        });
      } else {
        andConditions.push({
          $or: [
            { serieNombre: { $regex: serie, $options: "i" } },
            { seriesNombre: { $regex: serie, $options: "i" } }
          ]
        });
      }
    }

    if (origen) {
      if (isValidObjectId(origen)) {
        filter.origen = origen;
      } else {
        filter.origenNombre = { $regex: origen, $options: "i" };
      }
    }

    if (estado) filter.estado = normalizeEventStatus(estado);
    if (destacados !== undefined) filter.destacado = destacados === "true";

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const events = await populateEvent(
      Event.find(filter).sort({ fechaInicio: 1, createdAt: -1 })
    );

    res.json({
      message: "Lista de eventos obtenida correctamente",
      total: events.length,
      events: events.map(normalizeEventResponse)
    });
  } catch (error) {
    console.error("Error al obtener eventos:", error);

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
    console.error("Error al obtener evento:", error);

    res.status(500).json({
      message: "Error al obtener evento",
      error: error.message
    });
  }
};

const createEvent = async (req, res) => {
  try {
    const payload = await buildEventPayload(req.body, {
      includeImages: true
    });

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
    console.error("Error al crear evento:", error);

    res.status(error.name === "ValidationError" ? 400 : 500).json({
      message: "Error al crear evento",
      error: error.message
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const payload = await buildEventPayload(req.body, {
      includeImages: false
    });

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
    console.error("Error al actualizar evento:", error);

    res.status(error.name === "ValidationError" ? 400 : 500).json({
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
    console.error("Error al desactivar evento:", error);

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