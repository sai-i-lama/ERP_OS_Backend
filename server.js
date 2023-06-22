const fs = require("fs");
const https = require("https");
const app = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

console.log(process.env.NODE_ENV);

// run server depending on environment
if (process.env.NODE_ENV === "production") {
  https
    .createServer(
      {
        key: fs.readFileSync("/etc/letsencrypt/live/lfix.us/privkey.pem"),
        cert: fs.readFileSync("/etc/letsencrypt/live/lfix.us/fullchain.pem"),
      },
      app
    )
    .listen(PORT, () => {
      console.log(`Server is running on production port ${PORT}`);
    });
} else {
  app.listen(PORT, () => {
    console.log(`Server is running in development on port ${PORT}`);
  });
}
