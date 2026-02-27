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

async function start() {
  try {
    console.log("Connexion MySQL...");

    const url = process.env.MYSQL_URL;
    if (!url) throw new Error("MYSQL_URL undefined");

    db = await mysql.createConnection(url);

    console.log("MySQL connecté !");

    if (!process.env.TOKEN) throw new Error("TOKEN undefined");

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