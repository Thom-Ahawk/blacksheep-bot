require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    console.log("🔎 Test connexion MySQL...");

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      connectTimeout: 10000
    });

    console.log("✅ Connexion MySQL réussie !");
    await connection.end();

  } catch (error) {
    console.error("❌ Erreur connexion MySQL :");
    console.error(error);
  }
})();