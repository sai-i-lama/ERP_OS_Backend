const express = require("express");
const {
  createSingleReturnPurchaseInvoice,
  getAllReturnPurchaseInvoice,
  getSingleReturnPurchaseInvoice,
  updateSingleReturnPurchaseInvoice,
  deleteSingleReturnPurchaseInvoice,
} = require("./returnPurchaseInvoice.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const returnPurchaseInvoiceRoutes = express.Router();

returnPurchaseInvoiceRoutes.post(
  "/",
  authorize("createReturnPurchaseInvoice"),
  createSingleReturnPurchaseInvoice
);
returnPurchaseInvoiceRoutes.get(
  "/",
  authorize("viewReturnPurchaseInvoice"),
  getAllReturnPurchaseInvoice
);
returnPurchaseInvoiceRoutes.get(
  "/:id",
  authorize("viewReturnPurchaseInvoice"),
  getSingleReturnPurchaseInvoice
);
// returnPurchaseInvoiceRoutes.put("/:id", authorize("updatePurchaseInvoice"), updateSinglePurchaseInvoice); // purchase invoice is not updatable
returnPurchaseInvoiceRoutes.patch(
  "/:id",
  authorize("deleteReturnPurchaseInvoice"),
  deleteSingleReturnPurchaseInvoice
);

module.exports = returnPurchaseInvoiceRoutes;
