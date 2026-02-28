require('dotenv').config();
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

/* ===================================
   Couleur selon nom de catégorie
=================================== */

function getCategoryColor(categoryName) {

  if (!categoryName) return "#e74c3c";

  switch (categoryName.toLowerCase()) {
    case "armée":
      return "#6c757d"; // Gris militaire

    case "logistique":
      return "#2ecc71"; // Vert logistique

    case "exploration":
      return "#3498db"; // Bleu exploration

    default:
      return "#e74c3c"; // Rouge modéré
  }
}

/* ===================================
   Connexion MySQL
=================================== */

async function connectDB() {
  if (!process.env.MYSQL_URL) {
    throw new Error("MYSQL_URL manquant !");
  }

  db = await mysql.createConnection(process.env.MYSQL_URL);
  console.log("✅ MySQL connecté !");
}

/* ===================================
   Vérification des news
=================================== */

async function checkNews() {
  try {
    const [rows] = await db.query(`
      SELECT news.*, categories.name AS category_name
      FROM news
      LEFT JOIN categories ON news.category_id = categories.id
      WHERE news.sent = 0
      ORDER BY news.id ASC
    `);

    if (rows.length === 0) return;

    const channel = await client.channels.fetch(process.env.NEWS_CHANNEL_ID);
    if (!channel) return;

    for (const news of rows) {

      const articleUrl =
        `${process.env.SITE_URL}/${process.env.NEWS_PATH}/${news.slug}`;

      const embed = new EmbedBuilder()
        .setColor(getCategoryColor(news.category_name))
        .setTitle(news.title)
        .setURL(articleUrl)
        .setDescription("Cliquez sur le bouton ci-dessous pour lire l’article.")
        .setFooter({ 
          text: `Catégorie : ${news.category_name || "Non définie"}`
        })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setLabel("Lire l'article")
        .setStyle(ButtonStyle.Link)
        .setURL(articleUrl);

      const row = new ActionRowBuilder().addComponents(button);

      await channel.send({
        content: "@everyone 🚨 Nouvelle publication !",
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

/* ===================================
   Démarrage
=================================== */

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