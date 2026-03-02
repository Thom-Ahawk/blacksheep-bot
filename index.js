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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

let db;

/* =========================
   DB
========================= */

async function connectDB() {
  db = await mysql.createConnection(process.env.MYSQL_URL);
  console.log("✅ MySQL connecté !");
}

/* =========================
   PARTICIPANTS
========================= */

async function getParticipants(eventId) {
  const [rows] = await db.query(`
    SELECT username, status
    FROM event_participants
    WHERE event_id = ?
  `, [eventId]);

  return {
    yes: rows.filter(r => r.status === "yes").map(r => r.username),
    maybe: rows.filter(r => r.status === "maybe").map(r => r.username),
    no: rows.filter(r => r.status === "no").map(r => r.username)
  };
}

/* =========================
   EMBED
========================= */

function buildEventEmbed(event, participants) {

  const startTimestamp = Math.floor(new Date(event.event_date).getTime() / 1000);
  const endTimestamp = event.event_end
    ? Math.floor(new Date(event.event_end).getTime() / 1000)
    : null;

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle("📅 Événement")
    .setDescription(`**${event.title}**\n\n${event.description || "Aucune description"}`)
    .addFields(
      { name: "🕒 Début", value: `<t:${startTimestamp}:F>` },
      { name: "🕓 Fin", value: endTimestamp ? `<t:${endTimestamp}:F>` : "Non définie" },
      { name: "📍 Lieu", value: event.location || "Non défini" },
      { name: "ℹ Informations", value: event.extra_info || "Aucune" },
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

  if (event.image) embed.setImage(event.image);

  return embed;
}

/* =========================
   BOUTONS
========================= */

function buildButtons(eventId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`event_yes_${eventId}`)
      .setLabel("Je participe")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`event_maybe_${eventId}`)
      .setLabel("Peut-être")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`event_no_${eventId}`)
      .setLabel("Non")
      .setStyle(ButtonStyle.Danger)
  );
}

/* =========================
   NOUVEAUX EVENTS
========================= */

async function checkNewEvents() {

  const [events] = await db.query(`
    SELECT *
    FROM events
    WHERE sent = 0
  `);

  if (!events.length) return;

  const channel = await client.channels.fetch(process.env.EVENT_CHANNEL_ID);

  for (const event of events) {

    const participants = { yes: [], maybe: [], no: [] };
    const embed = buildEventEmbed(event, participants);

    const message = await channel.send({
      content: "@everyone 📣 Nouvel événement !",
      embeds: [embed],
      components: [buildButtons(event.id)]
    });

    await db.query(`
      UPDATE events
      SET sent = 1, discord_message_id = ?
      WHERE id = ?
    `, [message.id, event.id]);

    console.log("📅 Event envoyé :", event.title);
  }
}

/* =========================
   MISE À JOUR EVENTS
========================= */

async function checkEventUpdates() {

  const channel = await client.channels.fetch(process.env.EVENT_CHANNEL_ID);

  const [events] = await db.query(`
    SELECT *
    FROM events
    WHERE sent = 1 AND discord_message_id IS NOT NULL
  `);

  for (const event of events) {

    try {
      const message = await channel.messages.fetch(event.discord_message_id);

      const participants = await getParticipants(event.id);
      const embed = buildEventEmbed(event, participants);

      await message.edit({
        embeds: [embed],
        components: [buildButtons(event.id)]
      });

    } catch (err) {
      // message supprimé manuellement
    }
  }
}

/* =========================
   SUPPRESSION STABLE
========================= */

async function checkExpiredOrDeletedEvents() {

  const channel = await client.channels.fetch(process.env.EVENT_CHANNEL_ID);
  const now = new Date();

  const messages = await channel.messages.fetch({ limit: 50 });

  for (const msg of messages.values()) {

    if (msg.author.id !== client.user.id) continue;

    const [rows] = await db.query(`
      SELECT id, event_end
      FROM events
      WHERE discord_message_id = ?
    `, [msg.id]);

    // Event supprimé en base
    if (!rows.length) {
      await msg.delete().catch(() => {});
      console.log("🗑 Event supprimé en base");
      continue;
    }

    const event = rows[0];

    // Event expiré
    if (event.event_end && new Date(event.event_end) < now) {

      await msg.delete().catch(() => {});

      await db.query(`
        UPDATE events
        SET discord_message_id = NULL
        WHERE id = ?
      `, [event.id]);

      console.log("🗑 Event expiré supprimé :", event.id);
    }
  }
}

/* =========================
   INTERACTIONS
========================= */

client.on("interactionCreate", async interaction => {

  if (!interaction.isButton()) return;

  const [type, response, eventId] = interaction.customId.split("_");
  if (type !== "event") return;

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

  await checkEventUpdates(); // mise à jour instantanée
});

/* =========================
   START
========================= */

client.once("clientReady", () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);

  setInterval(checkNewEvents, 15000);
  setInterval(checkEventUpdates, 30000);
  setInterval(checkExpiredOrDeletedEvents, 30000);
});

async function start() {
  await connectDB();
  await client.login(process.env.TOKEN);
}

start();