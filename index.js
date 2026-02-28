require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const mysql = require("mysql2/promise");

/* ===================================================
   CLIENT DISCORD
=================================================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let db;

/* ===================================================
   NORMALISATION TEXTE
=================================================== */

function normalizeText(text) {
  return text
    ?.toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* ===================================================
   COULEUR PAR CATÉGORIE
=================================================== */

function getCategoryColor(categoryName) {
  const normalized = normalizeText(categoryName);

  const colors = {
    armee: 0x6c757d,
    logistique: 0x2ecc71,
    exploration: 0x3498db
  };

  return colors[normalized] || 0xe74c3c;
}

/* ===================================================
   CONNEXION MYSQL
=================================================== */

async function connectDB() {
  if (!process.env.MYSQL_URL) {
    throw new Error("❌ MYSQL_URL manquant !");
  }

  db = await mysql.createConnection(process.env.MYSQL_URL);
  console.log("✅ MySQL connecté !");
}

/* ===================================================
   CHECK NEWS
=================================================== */

async function checkNews() {
  try {
    const [rows] = await db.query(`
      SELECT news.*, categories.name AS category_name
      FROM news
      LEFT JOIN categories ON news.category_id = categories.id
      WHERE news.sent = 0
      ORDER BY news.id ASC
    `);

    if (!rows.length) return;

    const channel = await client.channels.fetch(process.env.NEWS_CHANNEL_ID);
    if (!channel) {
      console.error("❌ Channel introuvable.");
      return;
    }

    for (const news of rows) {

      const articleUrl = `${process.env.SITE_URL}/${process.env.NEWS_PATH}/${news.slug}`;

      /* ================= IMAGE ================= */

      let imageUrl = null;

      if (news.image) {
        imageUrl = news.image.startsWith("http")
          ? news.image
          : `${process.env.SITE_URL}/Black-Sheep/assets/img/news/${news.image}`;
      }

      /* ================= EMBED ================= */

      const embed = new EmbedBuilder()
        .setColor(getCategoryColor(news.category_name))
        .setTitle(news.title)
        .setURL(articleUrl)
        .setDescription("Cliquez sur le bouton ci-dessous pour lire l’article.")
        .setFooter({
          text: `Catégorie : ${news.category_name || "Non définie"}`
        })
        .setTimestamp();

      if (imageUrl) {
        embed.setThumbnail(imageUrl); // petite image
        embed.setImage(imageUrl);     // grande bannière
      }

      /* ================= BOUTON ================= */

      const button = new ButtonBuilder()
        .setLabel("Lire l'article")
        .setStyle(ButtonStyle.Link)
        .setURL(articleUrl);

      const row = new ActionRowBuilder().addComponents(button);

      /* ================= ENVOI ================= */

      await channel.send({
        content: "@everyone 🚨 Nouvelle publication !",
        embeds: [embed],
        components: [row]
      });

      /* ================= UPDATE DB ================= */

      await db.query(
        "UPDATE news SET sent = 1 WHERE id = ?",
        [news.id]
      );

      console.log("📢 News envoyée :", news.title);
    }

  } catch (err) {
    console.error("❌ Erreur checkNews :", err);
  }
}

/* ===================================================
   START
=================================================== */

async function start() {

  const requiredVars = [
    "TOKEN",
    "NEWS_CHANNEL_ID",
    "SITE_URL",
    "NEWS_PATH",
    "MYSQL_URL"
  ];

  for (const variable of requiredVars) {
    if (!process.env[variable]) {
      throw new Error(`❌ Variable manquante : ${variable}`);
    }
  }

  await connectDB();
  await client.login(process.env.TOKEN);
}

client.once("clientReady", () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);
  setInterval(checkNews, 15000);
});

start();