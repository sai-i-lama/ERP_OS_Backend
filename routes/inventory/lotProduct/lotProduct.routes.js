const express = require("express");
const { CreateLotProduct } = require("./lotProduct.controllers");

const lotProductRoute = express.Router()


lotProductRoute.post("/", CreateLotProduct);


module.exports = {
    lotProductRoute,
}
