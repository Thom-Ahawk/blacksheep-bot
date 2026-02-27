require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const mysql = require('mysql2/promise');

console.log("=== VERSION MYSQL_PUBLIC_URL ===");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let db;

async function connectDB() {
  try {
    const url = process.env.MYSQL_PUBLIC_URL;

    if (!url) {
      throw new Error("MYSQL_PUBLIC_URL est undefined !");
    }

    console.log("Connexion via MYSQL_PUBLIC_URL...");

    db = await mysql.createConnection(url);

    console.log("✅ MySQL connecté !");
  } catch (err) {
    console.error("❌ ERREUR MYSQL :", err);
    process.exit(1);
  }
}

async function start() {
  try {
    if (!process.env.TOKEN) {
      throw new Error("TOKEN manquant !");
    }

    await connectDB();

    await client.login(process.env.TOKEN);

  } catch (err) {
    console.error("ERREUR FATALE :", err);
    process.exit(1);
  }
}

client.once('ready', () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    message.reply("pong");
  }
});

start();