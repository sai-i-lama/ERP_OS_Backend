const http = require("http");
const socketIo = require("socket.io");
const express = require("express");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:5001",
  "http://localhost:5000",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
  "https://erp-os-frontend.vercel.app",
  "http://192.168.1.176:3000",
  "http://192.168.1.176:5000"
];

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(
          new Error("CORS policy does not allow access from this origin."),
          false
        );
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"]
  }
});

// Objet pour garder une trace des sockets des utilisateurs
const userSockets = {};

io.on("connection", (socket) => {
  console.log("New client connecté");

  // Écoute de l'identification de l'utilisateur
  socket.on("identify", (userId) => {
    userSockets[userId] = socket.id;
  });

  socket.on("disconnect", () => {
    console.log("Client déconnecté");
    // Suppression de l'utilisateur de l'objet userSockets
    for (const [userId, socketId] of Object.entries(userSockets)) {
      if (socketId === socket.id) {
        delete userSockets[userId];
        break;
      }
    }
  });
});

// Fonction pour notifier un utilisateur spécifique
const notifyUser = (userId, message) => {
  const socketId = userSockets[userId];
  if (socketId) {
    io.to(socketId).emit("user-notification", message);
  } else {
    console.log(`User with ID ${userId} is not connected.`);
  }
};

// Fonction pour notifier tous les utilisateurs
const notifyAllUsers = (message) => {
  io.emit("staff-notification", message);
};

module.exports = { io, notifyUser, notifyAllUsers };
