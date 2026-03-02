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
   EMBED
========================= */

function buildEventEmbed(event, participants = { yes: [], maybe: [], no: [] }) {

  const startTimestamp = Math.floor(new Date(event.event_date).getTime() / 1000);

  const endTimestamp = event.event_end
    ? Math.floor(new Date(event.event_end).getTime() / 1000)
    : null;

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle("📅 Événement")
    .setDescription(`**${event.title}**\n\n${event.description || "Aucune description"}`)
    .addFields(
      {
        name: "🕒 Début",
        value: `<t:${startTimestamp}:F>`
      },
      {
        name: "🕓 Fin",
        value: endTimestamp ? `<t:${endTimestamp}:F>` : "Non définie"
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

  if (event.image) embed.setImage(event.image);

  return embed;
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

    await db.query(`
      UPDATE events
      SET sent = 1, discord_message_id = ?
      WHERE id = ?
    `, [message.id, event.id]);
  }
}

/* =========================
   SUPPRESSION PROPRE
========================= */

async function checkExpiredOrDeletedEvents() {

  const channel = await client.channels.fetch(process.env.EVENT_CHANNEL_ID);

  const [events] = await db.query(`
    SELECT id, discord_message_id, event_end
    FROM events
    WHERE discord_message_id IS NOT NULL
  `);

  const now = new Date();

  for (const event of events) {

    if (!event.discord_message_id) continue;

    if (event.event_end && new Date(event.event_end) < now) {

      try {
        const message = await channel.messages.fetch(event.discord_message_id);
        await message.delete();

        await db.query(`
          UPDATE events
          SET discord_message_id = NULL
          WHERE id = ?
        `, [event.id]);

        console.log("🗑 Event terminé supprimé :", event.id);

      } catch (err) {}
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

});

/* =========================
   START
========================= */

client.once("clientReady", () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);

  setInterval(checkNewEvents, 15000);
  setInterval(checkExpiredOrDeletedEvents, 30000);
});

async function start() {
  await connectDB();
  await client.login(process.env.TOKEN);
}

start();