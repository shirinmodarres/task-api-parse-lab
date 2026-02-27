require("dotenv").config();

const express = require("express");
const ParseDashboard = require("parse-dashboard");
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

const parseDashboard = new ParseDashboard(
  {
    apps: [
      {
        serverURL: process.env.SERVER_URL,
        appId: process.env.APP_ID,
        masterKey: process.env.MASTER_KEY,
        appName: "Task API Parse Lab",
      },
    ],
    users: [
      {
        user: process.env.DASHBOARD_USER,
        pass: process.env.DASHBOARD_PASS,
      },
    ],
  },
  {
    allowInsecureHTTP: true,
  }
);

app.use("/parse", parseServer.app);
app.use("/dashboard", parseDashboard);

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Parse learning server is running" });
});

async function start() {
  await parseServer.start();

  app.listen(process.env.PORT, () => {
    console.log(`Server: http://localhost:${process.env.PORT}`);
    console.log(`Parse API: ${process.env.SERVER_URL}`);
    console.log(`Parse Dashboard: http://localhost:${process.env.PORT}/dashboard`);
  });
}

start().catch((error) => {
  console.error("Failed to start Parse Server", error);
  process.exit(1);
});
