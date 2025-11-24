// Backend/config.js
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,             // asmadbss.mysql.database.azure.com
  user: process.env.DB_USER,             // asmaadmin@asmadbss
  password: process.env.DB_PASSWORD,     // contraseña de Azure
  database: process.env.DB_NAME,         // asma
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// SSL para Azure
if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = {
    rejectUnauthorized: true,
  };
}

module.exports = dbConfig;

