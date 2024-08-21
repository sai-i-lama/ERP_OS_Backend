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

// Suivi des sockets des utilisateurs et clients
const userSockets = {};
const customerSockets = {};

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("identify", async (data) => {
    const { userId, customerId } = data;
    if (userId) {
      userSockets[userId] = socket.id;
      // Envoyer les notifications non lues lors de la connexion
      const notifications = await prisma.notification.findMany({
        where: { userId: parseInt(userId, 10), isRead: false }
      });
      notifications.forEach((notification) => {
        socket.emit("user-notification", notification);
      });
    } else if (customerId) {
      customerSockets[customerId] = socket.id;
      // Envoyer les notifications non lues lors de la connexion
      const notifications = await prisma.notification.findMany({
        where: { customerId: parseInt(customerId, 10), isRead: false }
      });
      notifications.forEach((notification) => {
        socket.emit("customer-notification", notification);
      });
    }
  });

  socket.on("disconnect", () => {
    // Supprimer l'utilisateur ou le client de l'objet userSockets ou customerSockets
    Object.keys(userSockets).forEach((userId) => {
      if (userSockets[userId] === socket.id) delete userSockets[userId];
    });
    Object.keys(customerSockets).forEach((customerId) => {
      if (customerSockets[customerId] === socket.id)
        delete customerSockets[customerId];
    });
  });
});

const notifyUserOrCustomer = async (notificationData) => {
  const { userId, customerId, message, type } = notificationData;

  if (userId) {
    // Créer et envoyer une notification pour un utilisateur
    const notification = await prisma.notification.create({
      data: {
        userId: parseInt(userId, 10),
        message,
        type,
        isRead: false
      }
    });
    const socketId = userSockets[userId];
    if (socketId) {
      io.to(socketId).emit("user-notification", notification);
    }
  } else if (customerId) {
    // Créer et envoyer une notification pour un client
    const notification = await prisma.notification.create({
      data: {
        customerId: parseInt(customerId, 10),
        message,
        type,
        isRead: false
      }
    });
    const socketId = customerSockets[customerId];
    if (socketId) {
      io.to(socketId).emit("customer-notification", notification);
    }
  }
};

const notifyAllUsers = async (message) => {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        message,
        type: "general",
        isRead: false
      }
    });
    const socketId = userSockets[user.id];
    if (socketId) {
      io.to(socketId).emit("user-notification", notification);
    }
  }
};

const readNotif = async (req, res) => {
  const { userId, customerId } = req.body;

  if (!userId && !customerId) {
    return res
      .status(400)
      .json({ error: "User ID or Customer ID is required" });
  }

  try {
    if (userId) {
      await prisma.notification.updateMany({
        where: { userId: parseInt(userId, 10), isRead: false },
        data: { isRead: true }
      });
      res.status(200).json({ message: "User notifications marked as read" });
    } else if (customerId) {
      await prisma.notification.updateMany({
        where: { customerId: parseInt(customerId, 10), isRead: false },
        data: { isRead: true }
      });
      res
        .status(200)
        .json({ message: "Customer notifications marked as read" });
    }
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { io, notifyAllUsers, notifyUserOrCustomer, readNotif };
