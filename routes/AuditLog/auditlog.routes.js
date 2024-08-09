const express = require("express");
const { getAuditLogs } = require("./auditlog.controllers");
const authorize = require("../../utils/authorize"); // authentication middleware

const auditLogRoutes = express.Router();

auditLogRoutes.get("/", authorize("viewSetting"), getAuditLogs);

module.exports = auditLogRoutes;
