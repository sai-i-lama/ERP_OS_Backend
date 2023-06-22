const express = require("express");
const {
  createSingleTransaction,
  getAllTransaction,
  getSingleTransaction,
  updateSingleTransaction,
  deleteSingleTransaction,
} = require("./transaction.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const transactionRoutes = express.Router();

transactionRoutes.post(
  "/",
  authorize("createTransaction"),
  createSingleTransaction
);
transactionRoutes.get("/", authorize("viewTransaction"), getAllTransaction);
transactionRoutes.get(
  "/:id",
  authorize("viewTransaction"),
  getSingleTransaction
);
transactionRoutes.put(
  "/:id",
  authorize("updateTransaction"),
  updateSingleTransaction
);
transactionRoutes.patch(
  "/:id",
  authorize("deleteTransaction"),
  deleteSingleTransaction
);

module.exports = transactionRoutes;
