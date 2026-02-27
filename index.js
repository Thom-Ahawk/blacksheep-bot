require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const mysql = require('mysql2/promise');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let db;

// Connexion MySQL
async function connectDB() {
  if (!process.env.MYSQL_URL) {
    throw new Error("MYSQL_URL manquant !");
  }

  db = await mysql.createConnection(process.env.MYSQL_URL);
  console.log("✅ MySQL connecté !");
}

// Démarrage du bot
async function start() {
  if (!process.env.TOKEN) {
    throw new Error("TOKEN manquant !");
  }

  await connectDB();
  await client.login(process.env.TOKEN);
}

// Événement prêt (corrigé pour v14)
client.once('clientReady', () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);
});

// Commandes
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    message.reply("pong");
  }

  if (message.content === "!dbtest") {
    try {
      const [rows] = await db.query("SELECT 1 + 1 AS result");
      message.reply("DB OK : " + rows[0].result);
    } catch (err) {
      console.error("Erreur DB :", err);
      message.reply("Erreur base de données.");
    }
  }
});

start();