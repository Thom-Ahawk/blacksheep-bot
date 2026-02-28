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
   CONNEXION MYSQL
=================================================== */

async function connectDB() {
  db = await mysql.createConnection(process.env.MYSQL_URL);
  console.log("✅ MySQL connecté !");
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
      ORDER BY event_date ASC
    `);

    if (!rows.length) return;

    const channel = await client.channels.fetch(process.env.EVENT_CHANNEL_ID);
    if (!channel) return console.error("❌ Channel events introuvable.");

    for (const event of rows) {

      const timestamp = Math.floor(new Date(event.event_date).getTime() / 1000);

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("📅 Nouvel événement")
        .setDescription(`**${event.title}**\n\n${event.description || "Aucune description"}`)
        .addFields(
          { name: "🕒 Date", value: `<t:${timestamp}:F>` },
          { name: "✅ Je participe (0)", value: "—", inline: true },
          { name: "🤔 Peut-être (0)", value: "—", inline: true },
          { name: "❌ Non (0)", value: "—", inline: true }
        )
        .setFooter({ text: "Black Sheep Events" })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`event_yes_${event.id}`)
          .setLabel("Je participe")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`event_maybe_${event.id}`)
          .setLabel("Peut-être")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`event_no_${event.id}`)
          .setLabel("Non")
          .setStyle(ButtonStyle.Danger)
      );

      const message = await channel.send({
        content: "@everyone 📣 Nouvel événement !",
        embeds: [embed],
        components: [row]
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
   UPDATE MESSAGE PARTICIPANTS
=================================================== */

async function updateEventMessage(eventId, message) {

  const [rows] = await db.query(`
    SELECT username, status
    FROM event_participants
    WHERE event_id = ?
  `, [eventId]);

  const yes = rows.filter(r => r.status === "yes").map(r => r.username);
  const maybe = rows.filter(r => r.status === "maybe").map(r => r.username);
  const no = rows.filter(r => r.status === "no").map(r => r.username);

  const embed = EmbedBuilder.from(message.embeds[0])
    .setFields(
      { name: "🕒 Date", value: message.embeds[0].fields[0].value },
      {
        name: `✅ Je participe (${yes.length})`,
        value: yes.length ? yes.join("\n") : "—",
        inline: true
      },
      {
        name: `🤔 Peut-être (${maybe.length})`,
        value: maybe.length ? maybe.join("\n") : "—",
        inline: true
      },
      {
        name: `❌ Non (${no.length})`,
        value: no.length ? no.join("\n") : "—",
        inline: true
      }
    );

  await message.edit({ embeds: [embed] });
}

/* ===================================================
   INTERACTIONS BOUTONS
=================================================== */

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  const [type, response, eventId] = interaction.customId.split("_");

  if (type !== "event") return;

  try {

    await db.query(`
      INSERT INTO event_participants (event_id, user_id, username, status)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `, [
      eventId,
      interaction.user.id,
      interaction.user.username,
      response
    ]);

    await interaction.reply({
      content: "Réponse enregistrée ✅",
      ephemeral: true
    });

    await updateEventMessage(eventId, interaction.message);

  } catch (err) {
    console.error("❌ Erreur interaction :", err);
  }

});

/* ===================================================
   START
=================================================== */

async function start() {

  const requiredVars = [
    "TOKEN",
    "EVENT_CHANNEL_ID",
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
  setInterval(checkEvents, 15000);
});

start();