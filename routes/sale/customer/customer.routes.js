const express = require("express");
const {
  createSingleCustomer,
  getAllCustomer,
  getSingleCustomer,
  updateSingleCustomer,
  deleteSingleCustomer,
} = require("./customer.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const customerRoutes = express.Router();

customerRoutes.post("/", authorize("createCustomer"), createSingleCustomer);
customerRoutes.get("/", authorize("viewCustomer"), getAllCustomer);
customerRoutes.get("/:id", authorize("viewCustomer"), getSingleCustomer);
customerRoutes.put("/:id", authorize("updateCustomer"), updateSingleCustomer);
customerRoutes.patch("/:id", authorize("deleteCustomer"), deleteSingleCustomer);

module.exports = customerRoutes;
