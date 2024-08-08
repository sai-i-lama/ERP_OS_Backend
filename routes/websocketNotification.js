const http = require("http");
const socketIo = require("socket.io");
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors());

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

const prisma = new PrismaClient();

// Objet pour garder une trace des sockets des utilisateurs
const userSockets = {};

io.on("connection", (socket) => {
  console.log("New client connecté");

  // Écoute de l'identification de l'utilisateur
  socket.on("identify", (userId) => {
    console.log(`User identified: ${userId}`);
    userSockets[userId] = socket.id;

    // Envoyer les notifications non lues lors de la connexion
    (async () => {
      const userIdInt = parseInt(userId, 10); // Convertir userId en entier
      const notifications = await prisma.notification.findMany({
        where: {
          cusId: userIdInt,
          isRead: false
        }
      });

      notifications.forEach((notification) => {
        socket.emit("user-notification", notification);
      });
    })();
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

const readNotif = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    await prisma.notification.updateMany({
      where: { cusId: parseInt(userId, 10), isRead: false },
      data: { isRead: true }
    });
    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Fonction pour notifier un utilisateur spécifique
const notifyUser = async (userId, notificationData) => {
  // Convertir userId en entier
  const userIdInt = parseInt(userId, 10);

  // Créer la notification dans la base de données
  const notification = await prisma.notification.create({
    data: {
      cusId: userIdInt,
      message: notificationData.message,
      type: notificationData.type,
      isRead: false
    }
  });

  // Envoyer la notification si l'utilisateur est connecté
  const socketId = userSockets[userIdInt];
  if (socketId) {
    io.to(socketId).emit("user-notification", notification);
  } else {
    console.log(`User with ID ${userIdInt} is not connected.`);
  }
};

// Fonction pour notifier tous les utilisateurs
const notifyAllUsers = (message) => {
  io.emit("staff-notification", message);
};

module.exports = { io, notifyUser, notifyAllUsers, readNotif };
