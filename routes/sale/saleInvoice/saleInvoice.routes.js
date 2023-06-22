const express = require("express");
const {
  createSingleSaleInvoice,
  getAllSaleInvoice,
  getSingleSaleInvoice,
} = require("./saleInvoice.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const saleInvoiceRoutes = express.Router();

saleInvoiceRoutes.post(
  "/",
  authorize("createSaleInvoice"),
  createSingleSaleInvoice
);
saleInvoiceRoutes.get("/", authorize("viewSaleInvoice"), getAllSaleInvoice);
saleInvoiceRoutes.get(
  "/:id",
  authorize("viewSaleInvoice"),
  getSingleSaleInvoice
);

module.exports = saleInvoiceRoutes;
