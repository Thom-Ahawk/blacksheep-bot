require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const mysql = require('mysql2/promise');

// ==============================
// DISCORD CLIENT
// ==============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==============================
// MYSQL CONNECTION (Railway)
// ==============================
let db;

async function connectDB() {
  try {
    console.log("🔎 Test connexion MySQL...");

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL manquante dans les variables Railway");
    }

    db = await mysql.createConnection(
      process.env.DATABASE_URL + "?ssl={\"rejectUnauthorized\":false}"
    );

    console.log("✅ Connecté à MySQL");
  } catch (error) {
    console.error("❌ Erreur connexion MySQL :", error);
    process.exit(1);
  }
}

// ==============================
// BOT READY
// ==============================
client.once('ready', async () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);
  await connectDB();
});

// ==============================
// COMMANDES
// ==============================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // -------- !ping --------
  if (message.content === "!ping") {
    return message.reply("🏓 Pong !");
  }

  // -------- !classement --------
  if (message.content === "!classement") {
    try {
      if (!db) {
        return message.reply("⚠️ Base de données non connectée.");
      }

      const [rows] = await db.execute(
        "SELECT username, points FROM users ORDER BY points DESC LIMIT 10"
      );

      if (rows.length === 0) {
        return message.reply("Aucun classement disponible.");
      }

      let classement = "🏆 **Classement Top 10**\n\n";

      rows.forEach((row, index) => {
        classement += `${index + 1}. ${row.username} - ${row.points} pts\n`;
      });

      message.reply(classement);

    } catch (error) {
      console.error("Erreur classement :", error);
      message.reply("⚠️ Erreur récupération classement.");
    }
  }
});

// ==============================
// LOGIN
// ==============================
client.login(process.env.TOKEN);