rrequire('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

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

      /* ===============================
         EMBED STYLÉ
      ================================ */

      const embed = new EmbedBuilder()
        .setColor("#ff0055") // couleur personnalisable
        .setTitle(news.title)
        .setURL(articleUrl) // 👈 titre cliquable
        .setDescription("Cliquez sur le bouton ci-dessous pour lire l’article.")
        .setFooter({ text: "Black Sheep News" })
        .setTimestamp();

      /* ===============================
         BOUTON CLIQUABLE
      ================================ */

      const button = new ButtonBuilder()
        .setLabel("Lire l'article")
        .setStyle(ButtonStyle.Link)
        .setURL(articleUrl);

      const row = new ActionRowBuilder().addComponents(button);

      await channel.send({
        embeds: [embed],
        components: [row]
      });

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

  if (!process.env.TOKEN) throw new Error("TOKEN manquant !");
  if (!process.env.NEWS_CHANNEL_ID) throw new Error("NEWS_CHANNEL_ID manquant !");
  if (!process.env.SITE_URL) throw new Error("SITE_URL manquant !");
  if (!process.env.NEWS_PATH) throw new Error("NEWS_PATH manquant !");

  await connectDB();
  await client.login(process.env.TOKEN);
}

client.once('clientReady', () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);
  setInterval(checkNews, 15000);
});

start();