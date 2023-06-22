const express = require("express");
const crypto = require("crypto"); // for generating random names
const multer = require("multer");
const {
  createSingleProduct,
  getAllProduct,
  getSingleProduct,
  updateSingleProduct,
  deleteSingleProduct,
} = require("./product.controllers");
const authorize = require("../../../utils/authorize"); // authentication middleware

const productRoutes = express.Router();
const productImageRoutes = express.Router();

// generate random file name for extra security on naming
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

// store files upload folder in disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "routes/inventory/product/uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = generateFileName();
    cb(null, uniqueSuffix + ".jpg");
  },
});
// multer middleware
const upload = multer({ storage: storage });

productRoutes.post(
  "/",
  authorize("createProduct"),
  upload.single("image"),
  createSingleProduct
);
productRoutes.get("/", authorize("viewProduct"), getAllProduct);
productRoutes.get("/:id", authorize("viewProduct"), getSingleProduct);
productRoutes.put("/:id", authorize("updateProduct"), updateSingleProduct);
productRoutes.patch("/:id", authorize("deleteProduct"), deleteSingleProduct);

// to serve image from disk
productImageRoutes.get("/:id", (req, res) => {
  res.sendFile(__dirname + "/uploads/" + req.params.id, (err) => {
    if (err) {
      res.status(404).send("Not found");
    }
  });
});

module.exports = {
  productRoutes,
  productImageRoutes,
};
