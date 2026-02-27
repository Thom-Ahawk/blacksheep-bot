console.log("VERSION 9999");
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
  try {
    console.log("=== TEST VARIABLES ===");
    console.log("MYSQLHOST:", process.env.MYSQLHOST);
    console.log("MYSQLUSER:", process.env.MYSQLUSER);
    console.log("MYSQLDATABASE:", process.env.MYSQLDATABASE);
    console.log("MYSQLPORT:", process.env.MYSQLPORT);

    console.log("Connexion MySQL...");

    db = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT
    });

    console.log("MySQL connecté !");
  } catch (err) {
    console.error("ERREUR MYSQL DETAILLEE :", err);
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
  console.log(`Bot connecté : ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    message.reply("pong");
  }
});

start();