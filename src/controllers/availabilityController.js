const mongoose = require("mongoose");

const Availability = require("../models/Availability");
const Product = require("../models/Product");
const { createSlug } = require("../utils/slugHelper");
const { emitSocketEvent } = require("../utils/socketHelper");

const DEFAULT_AVAILABILITIES = [
  {
    nombre: "En stock",
    value: "stock",
    estado: "Activo",
    descripcion: "Producto disponible para pedido inmediato.",
    orden: 0,
    esDefault: true
  },
  {
    nombre: "Preventa",
    value: "preventa",
    estado: "Preventa",
    descripcion: "Producto disponible bajo preventa.",
    orden: 1,
    esDefault: true
  },
  {
    nombre: "Por pedido",
    value: "por_pedido",
    estado: "Por pedido",
    descripcion: "Producto disponible solo por pedido.",
    orden: 2,
    esDefault: true
  },
  {
    nombre: "Agotado",
    value: "agotado",
    estado: "Agotado",
    descripcion: "Producto sin stock disponible.",
    orden: 3,
    esDefault: true
  }
];

const VALID_STATES = ["Activo", "Preventa", "Por pedido", "Agotado", "Inactivo"];

const isValidObjectId = (value) => {
  return value && mongoose.Types.ObjectId.isValid(value);
};

const escapeRegex = (text = "") => {
  return text.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const normalizeText = (text = "") => {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

const createAvailabilityValue = (text = "") => {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const getTextValue = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return found ? found.toString().trim() : "";
};

const normalizeAvailabilityName = (body = {}) => {
  return getTextValue(body.nombre, body.name, body.label, body.disponibilidad);
};

const normalizeAvailabilityValue = (body = {}, fallbackName = "") => {
  const rawValue = getTextValue(body.value, body.valor, body.disponibilidad);

  if (rawValue) return createAvailabilityValue(rawValue);

  return createAvailabilityValue(fallbackName);
};

const normalizeAvailabilityState = (estado = "", value = "") => {
  if (VALID_STATES.includes(estado)) return estado;

  const cleanValue = normalizeText(value);

  if (cleanValue.includes("preventa")) return "Preventa";
  if (cleanValue.includes("pedido")) return "Por pedido";
  if (cleanValue.includes("agotado")) return "Agotado";
  if (cleanValue.includes("inactivo")) return "Inactivo";

  return "Activo";
};

const normalizeAvailabilityPayload = (body = {}) => {
  const nombre = normalizeAvailabilityName(body);
  const value = normalizeAvailabilityValue(body, nombre);
  const estado = normalizeAvailabilityState(body.estado, value);

  return {
    nombre,
    slug: createSlug(nombre || value),
    value,
    estado,
    descripcion: getTextValue(body.descripcion, body.description),
    orden: Number(body.orden || 0),
    esDefault: Boolean(body.esDefault)
  };
};

const normalizeAvailabilityResponse = async (availability) => {
  const plainAvailability =
    typeof availability.toObject === "function"
      ? availability.toObject()
      : availability;

  const usageCount = await Product.countDocuments({
    disponibilidad: plainAvailability.value
  });

  return {
    ...plainAvailability,
    usageCount
  };
};

const findAvailabilityByIdOrValue = async (identifier) => {
  if (!identifier) return null;

  if (isValidObjectId(identifier)) {
    const byId = await Availability.findById(identifier);

    if (byId) return byId;
  }

  return Availability.findOne({
    $or: [
      {
        value: identifier
      },
      {
        slug: identifier
      },
      {
        nombre: {
          $regex: `^${escapeRegex(identifier)}$`,
          $options: "i"
        }
      }
    ]
  });
};

const ensureDefaultAvailabilities = async () => {
  const createdOrUpdated = [];

  for (const defaultAvailability of DEFAULT_AVAILABILITIES) {
    const existingAvailability = await Availability.findOne({
      $or: [
        {
          value: defaultAvailability.value
        },
        {
          slug: createSlug(defaultAvailability.nombre)
        },
        {
          nombre: {
            $regex: `^${escapeRegex(defaultAvailability.nombre)}$`,
            $options: "i"
          }
        }
      ]
    });

    if (existingAvailability) {
      let changed = false;

      if (!existingAvailability.value) {
        existingAvailability.value = defaultAvailability.value;
        changed = true;
      }

      if (!existingAvailability.slug) {
        existingAvailability.slug = createSlug(defaultAvailability.nombre);
        changed = true;
      }

      if (existingAvailability.esDefault !== true) {
        existingAvailability.esDefault = true;
        changed = true;
      }

      if (changed) {
        await existingAvailability.save();
      }

      createdOrUpdated.push(existingAvailability);
      continue;
    }

    const createdAvailability = await Availability.create({
      ...defaultAvailability,
      slug: createSlug(defaultAvailability.nombre)
    });

    createdOrUpdated.push(createdAvailability);
  }

  return createdOrUpdated;
};

const getAvailabilities = async (req, res) => {
  try {
    const { search } = req.query;

    await ensureDefaultAvailabilities();

    const filter = {};

    if (search) {
      filter.$or = [
        {
          nombre: {
            $regex: search,
            $options: "i"
          }
        },
        {
          value: {
            $regex: search,
            $options: "i"
          }
        },
        {
          estado: {
            $regex: search,
            $options: "i"
          }
        }
      ];
    }

    const availabilities = await Availability.find(filter).sort({
      orden: 1,
      nombre: 1
    });

    const normalizedAvailabilities = await Promise.all(
      availabilities.map(normalizeAvailabilityResponse)
    );

    res.json({
      message: "Lista de disponibilidades obtenida correctamente",
      total: normalizedAvailabilities.length,
      availabilities: normalizedAvailabilities
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener disponibilidades",
      error: error.message
    });
  }
};

const getAvailabilityById = async (req, res) => {
  try {
    const availability = await findAvailabilityByIdOrValue(req.params.id);

    if (!availability) {
      return res.status(404).json({
        message: "Disponibilidad no encontrada"
      });
    }

    const normalizedAvailability = await normalizeAvailabilityResponse(
      availability
    );

    res.json({
      message: "Disponibilidad obtenida correctamente",
      availability: normalizedAvailability
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener disponibilidad",
      error: error.message
    });
  }
};

const createAvailability = async (req, res) => {
  try {
    const payload = normalizeAvailabilityPayload(req.body);

    if (!payload.nombre) {
      return res.status(400).json({
        message: "El nombre de la disponibilidad es obligatorio"
      });
    }

    if (!payload.value) {
      return res.status(400).json({
        message: "El valor de la disponibilidad es obligatorio"
      });
    }

    const availabilityExists = await Availability.findOne({
      $or: [
        {
          value: payload.value
        },
        {
          slug: payload.slug
        },
        {
          nombre: {
            $regex: `^${escapeRegex(payload.nombre)}$`,
            $options: "i"
          }
        }
      ]
    });

    if (availabilityExists) {
      return res.status(400).json({
        message: "Esta disponibilidad ya existe",
        availability: await normalizeAvailabilityResponse(availabilityExists)
      });
    }

    const availability = await Availability.create(payload);

    emitSocketEvent(req, "availability_created", {
      message: "Nueva disponibilidad creada",
      availability
    });

    res.status(201).json({
      message: "Disponibilidad creada correctamente",
      availability: await normalizeAvailabilityResponse(availability)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear disponibilidad",
      error: error.message
    });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const availability = await findAvailabilityByIdOrValue(req.params.id);

    if (!availability) {
      return res.status(404).json({
        message: "Disponibilidad no encontrada"
      });
    }

    const oldValue = availability.value;
    const payload = normalizeAvailabilityPayload(req.body);

    if (!payload.nombre) {
      return res.status(400).json({
        message: "El nombre de la disponibilidad es obligatorio"
      });
    }

    if (!payload.value) {
      return res.status(400).json({
        message: "El valor de la disponibilidad es obligatorio"
      });
    }

    const duplicatedAvailability = await Availability.findOne({
      _id: {
        $ne: availability._id
      },
      $or: [
        {
          value: payload.value
        },
        {
          slug: payload.slug
        },
        {
          nombre: {
            $regex: `^${escapeRegex(payload.nombre)}$`,
            $options: "i"
          }
        }
      ]
    });

    if (duplicatedAvailability) {
      return res.status(400).json({
        message: "Ya existe otra disponibilidad con ese nombre o valor"
      });
    }

    availability.nombre = payload.nombre;
    availability.slug = payload.slug;
    availability.value = payload.value;
    availability.estado = payload.estado;
    availability.descripcion = payload.descripcion;
    availability.orden = payload.orden;
    availability.esDefault = payload.esDefault;

    await availability.save();

    if (oldValue !== availability.value) {
      await Product.updateMany(
        {
          disponibilidad: oldValue
        },
        {
          $set: {
            disponibilidad: availability.value,
            estado: availability.estado
          }
        }
      );
    }

    emitSocketEvent(req, "availability_updated", {
      message: "Disponibilidad actualizada",
      availability
    });

    res.json({
      message: "Disponibilidad actualizada correctamente",
      availability: await normalizeAvailabilityResponse(availability)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar disponibilidad",
      error: error.message
    });
  }
};

const deleteAvailability = async (req, res) => {
  try {
    const availability = await findAvailabilityByIdOrValue(req.params.id);

    if (!availability) {
      return res.status(404).json({
        message: "Disponibilidad no encontrada"
      });
    }

    const reassignTo = getTextValue(
      req.body.reassignTo,
      req.body.reasignarA,
      req.body.replacementValue,
      req.body.nuevaDisponibilidad
    );

    const usageCount = await Product.countDocuments({
      disponibilidad: availability.value
    });

    let reassignedCount = 0;
    let replacementAvailability = null;

    if (usageCount > 0) {
      if (!reassignTo) {
        return res.status(400).json({
          message:
            "Esta disponibilidad está en uso. Debes reasignar sus productos antes de borrarla.",
          usageCount,
          availability: await normalizeAvailabilityResponse(availability)
        });
      }

      replacementAvailability = await findAvailabilityByIdOrValue(reassignTo);

      if (!replacementAvailability) {
        return res.status(404).json({
          message: "La disponibilidad destino para reasignar no existe"
        });
      }

      if (replacementAvailability.value === availability.value) {
        return res.status(400).json({
          message:
            "No puedes reasignar la disponibilidad a la misma disponibilidad que quieres borrar."
        });
      }

      const reassignmentResult = await Product.updateMany(
        {
          disponibilidad: availability.value
        },
        {
          $set: {
            disponibilidad: replacementAvailability.value,
            estado: replacementAvailability.estado
          }
        }
      );

      reassignedCount =
        reassignmentResult.modifiedCount ||
        reassignmentResult.nModified ||
        0;
    }

    await Availability.deleteOne({
      _id: availability._id
    });

    emitSocketEvent(req, "availability_deleted", {
      message: "Disponibilidad borrada definitivamente",
      availabilityId: availability._id,
      oldValue: availability.value,
      reassignedTo: replacementAvailability
        ? replacementAvailability.value
        : "",
      reassignedCount
    });

    res.json({
      message: "Disponibilidad borrada definitivamente",
      deletedAvailability: {
        id: availability._id,
        nombre: availability.nombre,
        value: availability.value
      },
      reassignedTo: replacementAvailability
        ? {
            id: replacementAvailability._id,
            nombre: replacementAvailability.nombre,
            value: replacementAvailability.value
          }
        : null,
      reassignedCount
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al borrar disponibilidad",
      error: error.message
    });
  }
};

const syncAvailabilities = async (req, res) => {
  try {
    const syncedAvailabilities = [];
    const skippedAvailabilities = [];

    const defaultAvailabilities = await ensureDefaultAvailabilities();

    defaultAvailabilities.forEach((availability) => {
      syncedAvailabilities.push(availability);
    });

    const productDisponibilidades = await Product.distinct("disponibilidad", {
      disponibilidad: {
        $nin: ["", null]
      }
    });

    for (const disponibilidadValue of productDisponibilidades) {
      const cleanValue = getTextValue(disponibilidadValue);

      if (!cleanValue) continue;

      const normalizedValue = createAvailabilityValue(cleanValue);

      const existingAvailability = await Availability.findOne({
        $or: [
          {
            value: cleanValue
          },
          {
            value: normalizedValue
          },
          {
            nombre: {
              $regex: `^${escapeRegex(cleanValue)}$`,
              $options: "i"
            }
          }
        ]
      });

      if (existingAvailability) {
        skippedAvailabilities.push(existingAvailability);
        continue;
      }

      const createdAvailability = await Availability.create({
        nombre: cleanValue,
        slug: createSlug(cleanValue),
        value: normalizedValue,
        estado: normalizeAvailabilityState("", normalizedValue),
        descripcion:
          "Disponibilidad sincronizada automáticamente desde productos existentes.",
        orden: 100,
        esDefault: false
      });

      syncedAvailabilities.push(createdAvailability);
    }

    const availabilities = await Availability.find({}).sort({
      orden: 1,
      nombre: 1
    });

    const normalizedAvailabilities = await Promise.all(
      availabilities.map(normalizeAvailabilityResponse)
    );

    emitSocketEvent(req, "availabilities_synced", {
      message: "Disponibilidades sincronizadas",
      total: normalizedAvailabilities.length
    });

    res.json({
      message: "Disponibilidades sincronizadas correctamente",
      total: normalizedAvailabilities.length,
      createdOrSynced: syncedAvailabilities.length,
      skipped: skippedAvailabilities.length,
      availabilities: normalizedAvailabilities
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al sincronizar disponibilidades",
      error: error.message
    });
  }
};

module.exports = {
  getAvailabilities,
  getAvailabilityById,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  syncAvailabilities
};