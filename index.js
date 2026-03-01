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
   BUILD EMBED EVENT
=================================================== */

function buildEventEmbed(event, participants = { yes: [], maybe: [], no: [] }) {

  const timestamp = Math.floor(new Date(event.event_date).getTime() / 1000);

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle("📅 Événement")
    .setDescription(`**${event.title}**\n\n${event.description || "Aucune description"}`)
    .addFields(
      {
        name: "🕒 Date",
        value: `<t:${timestamp}:F>`
      },
      {
        name: "📍 Lieu",
        value: event.location || "Non défini"
      },
      {
        name: "ℹ Informations",
        value: event.extra_info || "Aucune"
      },
      {
        name: `✅ Je participe (${participants.yes.length})`,
        value: participants.yes.length ? participants.yes.join("\n") : "—",
        inline: true
      },
      {
        name: `🤔 Peut-être (${participants.maybe.length})`,
        value: participants.maybe.length ? participants.maybe.join("\n") : "—",
        inline: true
      },
      {
        name: `❌ Non (${participants.no.length})`,
        value: participants.no.length ? participants.no.join("\n") : "—",
        inline: true
      }
    )
    .setFooter({ text: "Black Sheep Events" })
    .setTimestamp();

  if (event.image) {
    embed.setImage(event.image);
  }

  return embed;
}

/* ===================================================
   CHECK NOUVEAUX EVENTS
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
    if (!channel) return console.error("❌ Channel introuvable.");

    for (const event of rows) {

      const embed = buildEventEmbed(event);

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
   UPDATE PARTICIPANTS
=================================================== */

async function updateParticipants(eventId, message) {

  const [rows] = await db.query(`
    SELECT username, status
    FROM event_participants
    WHERE event_id = ?
  `, [eventId]);

  const participants = {
    yes: rows.filter(r => r.status === "yes").map(r => r.username),
    maybe: rows.filter(r => r.status === "maybe").map(r => r.username),
    no: rows.filter(r => r.status === "no").map(r => r.username)
  };

  const [eventRows] = await db.query(
    "SELECT * FROM events WHERE id = ?",
    [eventId]
  );

  if (!eventRows.length) return;

  const embed = buildEventEmbed(eventRows[0], participants);

  await message.edit({ embeds: [embed] });
}

/* ===================================================
   CHECK MODIFICATIONS EVENT
=================================================== */

async function checkEventUpdates() {

  const channel = await client.channels.fetch(process.env.EVENT_CHANNEL_ID);

  const [events] = await db.query(`
    SELECT *
    FROM events
    WHERE sent = 1
  `);

  for (const event of events) {

    if (!event.discord_message_id) continue;

    try {
      const message = await channel.messages.fetch(event.discord_message_id);

      const embed = buildEventEmbed(event);

      await message.edit({ embeds: [embed] });

    } catch (err) {
      // message supprimé manuellement
    }
  }
}

/* ===================================================
   SUPPRESSION SI EVENT SUPPRIMÉ
=================================================== */

async function checkDeletedEvents() {

  const channel = await client.channels.fetch(process.env.EVENT_CHANNEL_ID);

  const [rows] = await db.query(`
    SELECT discord_message_id
    FROM events
    WHERE discord_message_id IS NOT NULL
  `);

  const validIds = rows.map(r => r.discord_message_id);

  const messages = await channel.messages.fetch({ limit: 50 });

  messages.forEach(msg => {
    if (!validIds.includes(msg.id)) {
      msg.delete().catch(() => {});
    }
  });
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

    await updateParticipants(eventId, interaction.message);

  } catch (err) {
    console.error("❌ Erreur interaction :", err);
  }

});

/* ===================================================
   START
=================================================== */

async function start() {
  await connectDB();
  await client.login(process.env.TOKEN);
}

client.once("clientReady", () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);

  setInterval(checkEvents, 15000);
  setInterval(checkEventUpdates, 30000);
  setInterval(checkDeletedEvents, 60000);
});

start();