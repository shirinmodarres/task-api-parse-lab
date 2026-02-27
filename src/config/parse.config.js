require('dotenv').config();

module.exports = {
  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  databaseURI: process.env.DATABASE_URI,
  serverURL: process.env.SERVER_URL,
  publicServerURL: process.env.SERVER_URL,
};
