const express = require("express");
const {
  createSingleSupplier,
  getAllSupplier,
  getSingleSupplier,
  updateSingleSupplier,
  deleteSingleSupplier,
} = require("./supplier.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const supplierRoutes = express.Router();

supplierRoutes.post("/", authorize("createSupplier"), createSingleSupplier);
supplierRoutes.get("/", authorize("viewSupplier"), getAllSupplier);
supplierRoutes.get("/:id", authorize("viewSupplier"), getSingleSupplier);
supplierRoutes.put("/:id", authorize("updateSupplier"), updateSingleSupplier);
supplierRoutes.patch("/:id", authorize("deleteSupplier"), deleteSingleSupplier);

module.exports = supplierRoutes;
