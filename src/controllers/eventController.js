const Event = require("../models/Event");
const { createSlug } = require("../utils/slugHelper");
const { emitSocketEvent } = require("../utils/socketHelper");

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
      filter.titulo = { $regex: search, $options: "i" };
    }

    if (categoria) filter.categoria = categoria;
    if (serie) filter.serie = serie;
    if (origen) filter.origen = origen;
    if (estado) filter.estado = estado;
    if (destacados !== undefined) filter.destacado = destacados === "true";

    const events = await Event.find(filter)
      .populate("categoria", "nombre slug")
      .populate({
        path: "serie",
        select: "nombre slug creadores",
        populate: {
          path: "creadores",
          select: "nombre slug tipo"
        }
      })
      .populate("origen", "nombre slug")
      .sort({ fechaInicio: 1, createdAt: -1 });

    res.json({
      message: "Lista de eventos obtenida correctamente",
      total: events.length,
      events
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
    const event = await Event.findById(req.params.id)
      .populate("categoria", "nombre slug")
      .populate({
        path: "serie",
        select: "nombre slug creadores",
        populate: {
          path: "creadores",
          select: "nombre slug tipo"
        }
      })
      .populate("origen", "nombre slug");

    if (!event) {
      return res.status(404).json({
        message: "Evento no encontrado"
      });
    }

    res.json({
      message: "Evento obtenido correctamente",
      event
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
    const {
      titulo,
      descripcion,
      imagen,
      categoria,
      serie,
      origen,
      tipoEvento,
      fechaInicio,
      fechaFin,
      estado,
      destacado
    } = req.body;

    const slug = createSlug(titulo);

    const eventExists = await Event.findOne({ slug });

    if (eventExists) {
      return res.status(400).json({
        message: "Este evento ya existe"
      });
    }

    const event = await Event.create({
      titulo,
      slug,
      descripcion,
      imagen,
      categoria,
      serie,
      origen,
      tipoEvento,
      fechaInicio,
      fechaFin,
      estado,
      destacado
    });

    emitSocketEvent(req, "event_created", {
      message: "Nuevo evento creado",
      event
    });

    res.status(201).json({
      message: "Evento creado correctamente",
      event
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
    const {
      titulo,
      descripcion,
      imagen,
      categoria,
      serie,
      origen,
      tipoEvento,
      fechaInicio,
      fechaFin,
      estado,
      destacado,
      activo
    } = req.body;

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        message: "Evento no encontrado"
      });
    }

    if (titulo) {
      const slug = createSlug(titulo);

      const duplicatedEvent = await Event.findOne({
        slug,
        _id: { $ne: event._id }
      });

      if (duplicatedEvent) {
        return res.status(400).json({
          message: "Ya existe otro evento con ese título"
        });
      }

      event.titulo = titulo;
      event.slug = slug;
    }

    if (descripcion !== undefined) event.descripcion = descripcion;
    if (imagen !== undefined) event.imagen = imagen;
    if (categoria !== undefined) event.categoria = categoria;
    if (serie !== undefined) event.serie = serie;
    if (origen !== undefined) event.origen = origen;
    if (tipoEvento !== undefined) event.tipoEvento = tipoEvento;
    if (fechaInicio !== undefined) event.fechaInicio = fechaInicio || null;
    if (fechaFin !== undefined) event.fechaFin = fechaFin || null;
    if (estado !== undefined) event.estado = estado;
    if (destacado !== undefined) event.destacado = destacado;
    if (activo !== undefined) event.activo = activo;

    await event.save();

    emitSocketEvent(req, "event_updated", {
      message: "Evento actualizado",
      event
    });

    res.json({
      message: "Evento actualizado correctamente",
      event
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
      message: "Evento desactivado correctamente"
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