const nodemailer = require("nodemailer");
require("dotenv").config();

// Créez un transporteur Nodemailer avec les informations d'identification de Gmail
const transporter = nodemailer.createTransport({
  service: "gmail", // Utilisation de Gmail
  auth: {
    user: process.env.EMAIL_USER, // Votre adresse e-mail Gmail
    pass: process.env.EMAIL_PASS // Votre mot de passe Gmail ou mot de passe d'application
  }
});

module.exports = transporter