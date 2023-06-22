const express = require("express");
const {
  createSingleReturnSaleInvoice,
  getAllReturnSaleInvoice,
  getSingleReturnSaleInvoice,
  updateSingleReturnSaleInvoice,
  deleteSingleReturnSaleInvoice,
} = require("./returnSaleInvoice.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const returnSaleInvoiceRoutes = express.Router();

returnSaleInvoiceRoutes.post(
  "/",
  authorize("createReturnSaleInvoice"),
  createSingleReturnSaleInvoice
);
returnSaleInvoiceRoutes.get(
  "/",
  authorize("viewReturnSaleInvoice"),
  getAllReturnSaleInvoice
);
returnSaleInvoiceRoutes.get(
  "/:id",
  authorize("viewReturnSaleInvoice"),
  getSingleReturnSaleInvoice
);
// returnSaleInvoiceRoutes.put("/:id", authorize("updatePurchaseInvoice"), updateSinglePurchaseInvoice); // purchase invoice is not updatable
returnSaleInvoiceRoutes.patch(
  "/:id",
  authorize("deleteReturnSaleInvoice"),
  deleteSingleReturnSaleInvoice
);

module.exports = returnSaleInvoiceRoutes;
