const express = require("express");
const {
  createSinglePurchaseInvoice,
  getAllPurchaseInvoice,
  getSinglePurchaseInvoice,
} = require("./purchaseInvoice.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const purchaseInvoiceRoutes = express.Router();

purchaseInvoiceRoutes.post(
  "/",
  authorize("createPurchaseInvoice"),
  createSinglePurchaseInvoice
);
purchaseInvoiceRoutes.get(
  "/",
  authorize("viewPurchaseInvoice"),
  getAllPurchaseInvoice
);
purchaseInvoiceRoutes.get(
  "/:id",
  authorize("viewPurchaseInvoice"),
  getSinglePurchaseInvoice
);

module.exports = purchaseInvoiceRoutes;
