const express = require("express");
const { getAllPermission } = require("./permission.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const permissionRoutes = express.Router();

permissionRoutes.get("/", authorize("viewPermission"), getAllPermission);

module.exports = permissionRoutes;
