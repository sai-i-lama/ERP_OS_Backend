const express = require("express");
const {
  createSingleProductCategory,
  getAllProductCategory,
  getSingleProductCategory,
  updateSingleProductCategory,
  deleteSingleProductCategory,
} = require("./productCategory.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const productCategoryRoutes = express.Router();

productCategoryRoutes.post(
  "/",
  authorize("createProductCategory"),
  createSingleProductCategory
);
productCategoryRoutes.get(
  "/",
  authorize("viewProductCategory"),
  getAllProductCategory
);
productCategoryRoutes.get(
  "/:id",
  authorize("viewProductCategory"),
  getSingleProductCategory
);
productCategoryRoutes.put(
  "/:id",
  authorize("updateProductCategory"),
  updateSingleProductCategory
);
productCategoryRoutes.delete(
  "/:id",
  authorize("deleteProductCategory"),
  deleteSingleProductCategory
);

module.exports = productCategoryRoutes;
