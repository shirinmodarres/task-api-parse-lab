require("dotenv").config();

const express = require("express");
const { ParseServer } = require("parse-server");

const app = express();

const parseServer = new ParseServer({
  databaseURI: process.env.MONGO_URI,
  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  serverURL: process.env.SERVER_URL,
  cloud: __dirname + "/cloud/main.js",
  allowClientClassCreation: true, // only for learning
});

app.use("/parse", parseServer.app);

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Parse learning server is running" });
});

app.listen(process.env.PORT, () => {
  console.log(`Server: http://localhost:${process.env.PORT}`);
  console.log(`Parse API: ${process.env.SERVER_URL}`);
});