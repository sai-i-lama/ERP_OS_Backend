const authorize = require("../../utils/authorize");
const express = require("express");
const {
  login,
  register,
  getAllUser,
  getSingleUser,
  updateSingleUser,
  deleteSingleUser,
} = require("./user.controller.js");
const userRoutes = express.Router();

userRoutes.post("/login", login); // public route
userRoutes.post("/register", authorize("createUser"), register); // public route
userRoutes.get("/", authorize("viewUser"), getAllUser); // viewUser only
userRoutes.get("/:id", authorize("viewUser"), getSingleUser); // authenticated users can view their own and viewUser
userRoutes.put("/:id", authorize("updateUser"), updateSingleUser); // authenticated users can update their own and updateUser
userRoutes.patch("/:id", authorize("deleteUser"), deleteSingleUser); // deleteUser only

module.exports = userRoutes;
