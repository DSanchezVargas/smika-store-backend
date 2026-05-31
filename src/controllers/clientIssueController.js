const ClientIssue = require("../models/ClientIssue");
const { emitSocketEvent } = require("../utils/socketHelper");

const allowedTypes = [
  "comentario_pagina",
  "algo_no_carga",
  "falla_producto",
  "falla_pedido",
  "problema_visual",
  "otro"
];

const allowedStatuses = ["pendiente", "revisado", "resuelto", "descartado"];
const allowedPriorities = ["baja", "media", "alta"];

const getTextValue = (...values) => {
  const found = values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  return found ? found.toString().trim() : "";
};

const getUserName = (user = {}) => {
  return getTextValue(
    `${user.nombre || ""} ${user.apellido || ""}`.trim(),
    user.alias,
    user.email
  );
};

const normalizeIssueResponse = (issue) => {
  if (!issue) return null;

  const plainIssue = typeof issue.toObject === "function" ? issue.toObject() : issue;

  return {
    ...plainIssue,
    id: plainIssue._id
  };
};

const createClientIssue = async (req, res) => {
  try {
    const tipo = allowedTypes.includes(req.body.tipo)
      ? req.body.tipo
      : "comentario_pagina";

    const descripcion = getTextValue(req.body.descripcion, req.body.description);

    if (!descripcion) {
      return res.status(400).json({
        message: "La descripción de la incidencia es obligatoria"
      });
    }

    const issue = await ClientIssue.create({
      usuario: req.user._id || req.user.id,
      usuarioNombre: getUserName(req.user),
      usuarioEmail: req.user.email || req.user.correo || "",
      tipo,
      titulo: getTextValue(req.body.titulo, req.body.title),
      descripcion,
      pagina: getTextValue(req.body.pagina, req.body.page, req.body.url),
      estado: "pendiente",
      prioridad: allowedPriorities.includes(req.body.prioridad)
        ? req.body.prioridad
        : "media",
      activo: true
    });

    emitSocketEvent(req, "client_issue_created", {
      message: "Nueva incidencia de cliente",
      issue
    });

    res.status(201).json({
      message: "Incidencia enviada correctamente",
      issue: normalizeIssueResponse(issue),
      incidencia: normalizeIssueResponse(issue)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear incidencia",
      error: error.message
    });
  }
};

const getMyClientIssues = async (req, res) => {
  try {
    const issues = await ClientIssue.find({
      usuario: req.user._id || req.user.id,
      activo: true
    }).sort({ createdAt: -1 });

    res.json({
      message: "Mis incidencias obtenidas correctamente",
      total: issues.length,
      issues: issues.map(normalizeIssueResponse),
      incidencias: issues.map(normalizeIssueResponse)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener mis incidencias",
      error: error.message
    });
  }
};

const getClientIssues = async (req, res) => {
  try {
    const { estado, tipo, activos } = req.query;

    const filter = {};

    if (activos !== "false") {
      filter.activo = true;
    }

    if (estado && allowedStatuses.includes(estado)) {
      filter.estado = estado;
    }

    if (tipo && allowedTypes.includes(tipo)) {
      filter.tipo = tipo;
    }

    const issues = await ClientIssue.find(filter)
      .populate("usuario", "nombre apellido alias email role")
      .populate("revisadoPor", "nombre apellido alias email role")
      .sort({ createdAt: -1 });

    res.json({
      message: "Incidencias obtenidas correctamente",
      total: issues.length,
      issues: issues.map(normalizeIssueResponse),
      incidencias: issues.map(normalizeIssueResponse)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener incidencias",
      error: error.message
    });
  }
};

const updateClientIssue = async (req, res) => {
  try {
    const issue = await ClientIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        message: "Incidencia no encontrada"
      });
    }

    if (allowedStatuses.includes(req.body.estado)) {
      issue.estado = req.body.estado;
    }

    if (allowedPriorities.includes(req.body.prioridad)) {
      issue.prioridad = req.body.prioridad;
    }

    if (req.body.respuestaAdmin !== undefined || req.body.respuesta !== undefined) {
      issue.respuestaAdmin = getTextValue(req.body.respuestaAdmin, req.body.respuesta);
    }

    issue.revisadoPor = req.user._id || req.user.id;

    await issue.save();

    emitSocketEvent(req, "client_issue_updated", {
      message: "Incidencia actualizada",
      issue
    });

    res.json({
      message: "Incidencia actualizada correctamente",
      issue: normalizeIssueResponse(issue),
      incidencia: normalizeIssueResponse(issue)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar incidencia",
      error: error.message
    });
  }
};

const deleteClientIssue = async (req, res) => {
  try {
    const issue = await ClientIssue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        message: "Incidencia no encontrada"
      });
    }

    issue.activo = false;
    await issue.save();

    emitSocketEvent(req, "client_issue_deleted", {
      message: "Incidencia ocultada",
      issueId: issue._id
    });

    res.json({
      message: "Incidencia ocultada correctamente"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al ocultar incidencia",
      error: error.message
    });
  }
};

module.exports = {
  createClientIssue,
  getMyClientIssues,
  getClientIssues,
  updateClientIssue,
  deleteClientIssue
};
