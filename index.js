require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const mysql = require('mysql2/promise');

// =========================
// 🔹 CONFIG DISCORD
// =========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// =========================
// 🔹 CONFIG MYSQL
// =========================
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

// =========================
// 🔹 BOT READY
// =========================
client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

// =========================
// 🔹 COMMANDES
// =========================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Test simple
  if (message.content === '!ping') {
    return message.reply('🏓 Pong !');
  }

  // =========================
  // 🏆 CLASSEMENT CYCLONE
  // =========================
  if (message.content === '!classement') {
    try {

      const [rows] = await pool.query(`
        SELECT p.name, COALESCE(SUM(r.points), 0) AS total_points
        FROM cyclone_pilots p
        LEFT JOIN cyclone_results r ON p.id = r.pilot_id
        GROUP BY p.id
        ORDER BY total_points DESC
      `);

      if (rows.length === 0) {
        return message.reply("Aucun pilote trouvé.");
      }

      let classement = "🏆 **Classement Cyclone Trophy**\n\n";

      rows.forEach((pilot, index) => {
        classement += `${index + 1}. ${pilot.name} - ${pilot.total_points} pts\n`;
      });

      message.channel.send(classement);

    } catch (error) {
      console.error("❌ Erreur MySQL :", error.message);
      message.reply("⚠️ Erreur connexion base de données.");
    }
  }
});

// =========================
// 🔹 LOGIN
// =========================
client.login(process.env.TOKEN);