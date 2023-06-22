const express = require("express");
const { updateSetting, getSetting } = require("./setting.controllers");
const authorize = require("../../utils/authorize"); // authentication middleware

const settingRoutes = express.Router();

settingRoutes.put("/", authorize("updateSetting"), updateSetting);
settingRoutes.get("/", authorize("viewSetting"), getSetting);

module.exports = settingRoutes;
