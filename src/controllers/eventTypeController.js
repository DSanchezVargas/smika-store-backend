const EventType = require("../models/EventType");
const { createSlug } = require("../utils/slugHelper");

function escapeRegex(text = "") {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const normalizeEventTypeResponse = (eventType) => {
  const plainEventType = eventType?.toObject ? eventType.toObject() : eventType;

  if (!plainEventType) return null;

  return {
    ...plainEventType,
    id: plainEventType._id,
    _id: plainEventType._id,
    nombre: plainEventType.nombre,
    slug: plainEventType.slug,
    descripcion: plainEventType.descripcion || "",
    orden: Number(plainEventType.orden || 0),
    activo: plainEventType.activo !== false
  };
};

const getEventTypes = async (req, res) => {
  try {
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
      eventTypes: eventTypes.map(normalizeEventTypeResponse)
    });
  } catch (error) {
    console.error("Error al obtener tipos de evento:", error);

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
      eventType: normalizeEventTypeResponse(eventType)
    });
  } catch (error) {
    console.error("Error al obtener tipo de evento:", error);

    res.status(500).json({
      message: "Error al obtener tipo de evento",
      error: error.message
    });
  }
};

const createEventType = async (req, res) => {
  try {
    const nombre = req.body.nombre?.trim();

    if (!nombre) {
      return res.status(400).json({
        message: "El nombre del tipo de evento es obligatorio"
      });
    }

    const slug = createSlug(nombre);

    const existingEventType = await EventType.findOne({
      $or: [
        { slug },
        {
          nombre: {
            $regex: `^${escapeRegex(nombre)}$`,
            $options: "i"
          }
        }
      ]
    });

    if (existingEventType) {
      return res.status(400).json({
        message: "Este tipo de evento ya existe"
      });
    }

    const eventType = await EventType.create({
      nombre,
      slug,
      descripcion: req.body.descripcion?.trim() || "",
      orden: Number(req.body.orden || 0),
      activo:
        req.body.activo !== undefined
          ? Boolean(req.body.activo)
          : true
    });

    res.status(201).json({
      message: "Tipo de evento creado correctamente",
      eventType: normalizeEventTypeResponse(eventType)
    });
  } catch (error) {
    console.error("Error al crear tipo de evento:", error);

    res.status(error.name === "ValidationError" ? 400 : 500).json({
      message: "Error al crear tipo de evento",
      error: error.message
    });
  }
};

const updateEventType = async (req, res) => {
  try {
    const eventType = await EventType.findById(req.params.id);

    if (!eventType) {
      return res.status(404).json({
        message: "Tipo de evento no encontrado"
      });
    }

    if (req.body.nombre !== undefined) {
      const nombre = req.body.nombre.trim();

      if (!nombre) {
        return res.status(400).json({
          message: "El nombre del tipo de evento es obligatorio"
        });
      }

      const slug = createSlug(nombre);

      const duplicatedEventType = await EventType.findOne({
        slug,
        _id: { $ne: eventType._id }
      });

      if (duplicatedEventType) {
        return res.status(400).json({
          message: "Ya existe otro tipo de evento con ese nombre"
        });
      }

      eventType.nombre = nombre;
      eventType.slug = slug;
    }

    if (req.body.descripcion !== undefined) {
      eventType.descripcion = req.body.descripcion?.trim() || "";
    }

    if (req.body.orden !== undefined) {
      eventType.orden = Number(req.body.orden || 0);
    }

    if (req.body.activo !== undefined) {
      eventType.activo = Boolean(req.body.activo);
    }

    await eventType.save();

    res.json({
      message: "Tipo de evento actualizado correctamente",
      eventType: normalizeEventTypeResponse(eventType)
    });
  } catch (error) {
    console.error("Error al actualizar tipo de evento:", error);

    res.status(error.name === "ValidationError" ? 400 : 500).json({
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

    res.json({
      message: "Tipo de evento desactivado correctamente",
      eventType: normalizeEventTypeResponse(eventType)
    });
  } catch (error) {
    console.error("Error al desactivar tipo de evento:", error);

    res.status(500).json({
      message: "Error al desactivar tipo de evento",
      error: error.message
    });
  }
};

module.exports = {
  getEventTypes,
  getEventTypeById,
  createEventType,
  updateEventType,
  deleteEventType
};