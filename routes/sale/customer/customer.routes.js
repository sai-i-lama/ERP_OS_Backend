const express = require("express");
const {
  createSingleCustomer,
  getAllCustomer,
  getSingleCustomer,
  updateSingleCustomer,
  deleteSingleCustomer,
  resetPassword,
  sendTokenResetPassword,
} = require("./customer.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware
const { readNotif } = require("../../websocketNotification");

const customerRoutes = express.Router();

customerRoutes.post("/", createSingleCustomer);
customerRoutes.post("/createResetPassword", resetPassword);
customerRoutes.post("/sendTokenResetPassword", sendTokenResetPassword);
customerRoutes.get("/", authorize("viewCustomer"), getAllCustomer);
customerRoutes.get("/:id", authorize("viewCustomer"), getSingleCustomer);
customerRoutes.put("/:id", authorize("updateCustomer"), updateSingleCustomer);
customerRoutes.patch("/:id", authorize("deleteCustomer"), deleteSingleCustomer);
customerRoutes.post("/markNotificationsAsRead", readNotif)

module.exports = customerRoutes;
