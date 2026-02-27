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

async function connectDB() {
  console.log("MYSQL_URL =", process.env.MYSQL_URL);

  if (!process.env.MYSQL_URL) {
    throw new Error("MYSQL_URL manquant !");
  }

  console.log("Connexion MySQL...");
  db = await mysql.createConnection(process.env.MYSQL_URL);
  console.log("✅ MySQL connecté !");
}

async function start() {
  if (!process.env.TOKEN) {
    throw new Error("TOKEN manquant !");
  }

  await connectDB();
  await client.login(process.env.TOKEN);
}

client.once('ready', () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    message.reply("pong");
  }

  if (message.content === "!dbtest") {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    message.reply("DB OK : " + rows[0].result);
  }
});

start();