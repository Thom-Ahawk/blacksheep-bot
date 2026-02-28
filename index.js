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
    if (!channel) return console.error("❌ Channel news introuvable.");

    for (const news of rows) {

      const articleUrl = `${process.env.SITE_URL}/${process.env.NEWS_PATH}/${news.slug}`;

      const embed = new EmbedBuilder()
        .setColor(getCategoryColor(news.category_name))
        .setTitle(news.title)
        .setURL(articleUrl)
        .setDescription("Cliquez sur le bouton ci-dessous pour lire l’article.")
        .setFooter({
          text: `Catégorie : ${news.category_name || "Non définie"}`
        })
        .setTimestamp();

      if (news.image) {
        const baseUrl = process.env.SITE_URL.replace(/\/$/, "");
        const imageUrl = news.image.startsWith("http")
          ? news.image
          : `${baseUrl}/assets/img/news/${news.image}`;

        embed.setImage(imageUrl);
        embed.setThumbnail(imageUrl);
      }

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

      console.log("📢 News envoyée :", news.title);
    }

  } catch (err) {
    console.error("❌ Erreur checkNews :", err);
  }
}

/* ===================================================
   CHECK EVENTS
=================================================== */

async function checkEvents() {
  try {

    const [rows] = await db.query(`
      SELECT *
      FROM events
      WHERE sent = 0
      ORDER BY start_datetime ASC
    `);

    if (!rows.length) return;

    const channel = await client.channels.fetch(process.env.EVENT_CHANNEL_ID);
    if (!channel) return console.error("❌ Channel events introuvable.");

    for (const event of rows) {

      const startTimestamp = Math.floor(new Date(event.start_datetime).getTime() / 1000);

      const endTimestamp = event.end_datetime
        ? Math.floor(new Date(event.end_datetime).getTime() / 1000)
        : null;

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("📅 Nouvel événement")
        .setDescription(`**${event.title}**\n\n${event.description || "Aucune description"}`)
        .addFields(
          {
            name: "🕒 Début",
            value: `<t:${startTimestamp}:F>`,
            inline: true
          },
          {
            name: "🏁 Fin",
            value: endTimestamp
              ? `<t:${endTimestamp}:F>`
              : "Non définie",
            inline: true
          }
        )
        .setFooter({ text: "Black Sheep Events" })
        .setTimestamp();

      const message = await channel.send({
        content: "@everyone 📣 Nouvel événement !",
        embeds: [embed]
      });

      await db.query(
        "UPDATE events SET sent = 1, discord_message_id = ? WHERE id = ?",
        [message.id, event.id]
      );

      console.log("📅 Event envoyé :", event.title);
    }

  } catch (err) {
    console.error("❌ Erreur checkEvents :", err);
  }
}

/* ===================================================
   START
=================================================== */

async function start() {

  const requiredVars = [
    "TOKEN",
    "NEWS_CHANNEL_ID",
    "EVENT_CHANNEL_ID",
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
  setInterval(checkEvents, 15000);
});

start();