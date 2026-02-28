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

/* ===============================
   Connexion MySQL
================================ */

async function connectDB() {
  if (!process.env.MYSQL_URL) {
    throw new Error("MYSQL_URL manquant !");
  }

  db = await mysql.createConnection(process.env.MYSQL_URL);
  console.log("✅ MySQL connecté !");
}

/* ===============================
   Vérification des news
================================ */

async function checkNews() {
  try {
    const [rows] = await db.query(
      "SELECT * FROM news WHERE sent = 0 ORDER BY id ASC"
    );

    if (rows.length === 0) return;

    const channel = await client.channels.fetch(process.env.NEWS_CHANNEL_ID);
    if (!channel) return;

    for (const news of rows) {

      const articleUrl =
        `${process.env.SITE_URL}/${process.env.NEWS_PATH}/${news.slug}`;

      const message =
        `📰 **${news.title}**
🔗 ${articleUrl}`;

      await channel.send(message);

      await db.query(
        "UPDATE news SET sent = 1 WHERE id = ?",
        [news.id]
      );

      console.log("News envoyée :", news.title);
    }

  } catch (err) {
    console.error("Erreur checkNews :", err);
  }
}

/* ===============================
   Démarrage
================================ */

async function start() {

  if (!process.env.TOKEN) {
    throw new Error("TOKEN manquant !");
  }

  if (!process.env.NEWS_CHANNEL_ID) {
    throw new Error("NEWS_CHANNEL_ID manquant !");
  }

  if (!process.env.SITE_URL) {
    throw new Error("SITE_URL manquant !");
  }

  if (!process.env.NEWS_PATH) {
    throw new Error("NEWS_PATH manquant !");
  }

  await connectDB();
  await client.login(process.env.TOKEN);
}

client.once('clientReady', () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);
  setInterval(checkNews, 15000);
});

/* ===============================
   Commandes simples
================================ */

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
      message.reply("Erreur base de données.");
    }
  }
});

start();