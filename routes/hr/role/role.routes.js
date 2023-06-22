const express = require("express");
const {
  createSingleRole,
  getAllRole,
  getSingleRole,
  updateSingleRole,
  deleteSingleRole,
} = require("./role.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const roleRoutes = express.Router();

roleRoutes.post("/", authorize("createRole"), createSingleRole);
roleRoutes.get("/", authorize("viewRole"), getAllRole);
roleRoutes.get("/:id", authorize("viewRole"), getSingleRole);
roleRoutes.put("/:id", authorize("updateRole"), updateSingleRole);
roleRoutes.patch("/:id", authorize("deleteRole"), deleteSingleRole);

module.exports = roleRoutes;
