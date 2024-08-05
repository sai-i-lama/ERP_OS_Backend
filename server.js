// server.js
const fs = require("fs");
const https = require("https");
const app = require("./app");
require("dotenv").config();
const { io, notifyUser, notifyAllUsers } = require("./routes/websocketNotification");

const PORT = process.env.PORT || 5001;

console.log(process.env.NODE_ENV);

if (process.env.NODE_ENV === "production") {
  https
    .createServer(
      {
        key: fs.readFileSync("/etc/letsencrypt/live/lfix.us/privkey.pem"),
        cert: fs.readFileSync("/etc/letsencrypt/live/lfix.us/fullchain.pem")
      },
      app
    )
    .listen(PORT, () => {
      console.log(`Server is running on production port ${PORT}`);
    });
} else {
  const server = app.listen(PORT, () => {
    console.log(`Server is running in development on port ${PORT}`);
  });

  // Attach Socket.io to the server
  io.attach(server);
}

module.exports = { notifyUser, notifyAllUsers }; // Export the notifyUser function for use elsewhere
