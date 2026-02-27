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
    console.log("Connexion MySQL...");

    const url = process.env.MYSQL_URL;

    if (!url) {
      throw new Error("MYSQL_URL est undefined !");
    }

    db = await mysql.createConnection(url);

    console.log("MySQL connecté !");
  } catch (err) {
    console.error("Erreur MySQL :", err);
    process.exit(1);
  }
}

client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  await connectDB();
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    message.reply("pong");
  }
});

if (!process.env.TOKEN) {
  console.error("TOKEN manquant !");
  process.exit(1);
}

client.login(process.env.TOKEN);