require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const mysql = require('mysql2/promise');

// ==========================
// DISCORD CLIENT
// ==========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==========================
// MYSQL CONNECTION
// ==========================
let db;

async function connectDB() {
  try {
    console.log("🔎 Test connexion MySQL...");

    if (!process.env.MYSQL_URL) {
      throw new Error("MYSQL_URL est undefined !");
    }

    console.log("MYSQL_URL =", process.env.MYSQL_URL);

    db = await mysql.createConnection({
      uri: process.env.MYSQL_URL,
      ssl: { rejectUnauthorized: false }
    });

    console.log("✅ MySQL connecté !");
  } catch (err) {
    console.error("❌ Erreur MySQL :", err);
    process.exit(1);
  }
}

// ==========================
// BOT READY
// ==========================
client.once('ready', async () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);
  await connectDB();
});

// ==========================
// COMMANDES
// ==========================
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    message.reply("🏓 Pong !");
  }
});

// ==========================
// LOGIN
// ==========================
if (!process.env.TOKEN) {
  console.error("❌ TOKEN manquant !");
  process.exit(1);
}

client.login(process.env.TOKEN);