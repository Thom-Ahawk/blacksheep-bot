require('dotenv').config();
const mysql = require('mysql2/promise');

console.log("🔎 Démarrage test MySQL...");

(async () => {
  try {
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
    console.log("❌ ERREUR DÉTAILLÉE :");
    console.log(JSON.stringify(error, null, 2));
  }
})();

// Empêche Railway d'arrêter le container
setInterval(() => {
  console.log("⏳ En attente...");
}, 10000);