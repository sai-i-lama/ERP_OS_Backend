const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();

wss.on("connection", (ws, req) => {
  console.log("Nouveau client connecté");

  // Parse URL query parameters to get user ID
  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const userId = urlParams.get("userId");

  if (userId) {
    clients.set(userId, ws);
    console.log(`Client connecté avec l'ID utilisateur: ${userId}`);
  }

  ws.on("close", (code, reason) => {
    console.log(`Client déconnecté: ${code} - ${reason}`);
    clients.forEach((clientWs, clientId) => {
      if (clientWs === ws) {
        clients.delete(clientId);
      }
    });
  });

  ws.on("error", (error) => {
    console.error("Erreur WebSocket:", error);
  });
});

const notifyAdmin = (message) => {
  console.log("Envoi de la notification aux clients connectés:", message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

// const notifyClient = (userId, message) => {
//   const clientWs = clients.get(userId);
//   if (clientWs && clientWs.readyState === WebSocket.OPEN) {
//     clientWs.send(JSON.stringify(message));
//   }
// };

module.exports = { notifyAdmin };
