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

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

client.once('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.content === '!classement') {

    const [rows] = await db.query(`
      SELECT p.name, COALESCE(SUM(r.points), 0) AS total_points
      FROM cyclone_pilots p
      LEFT JOIN cyclone_results r ON p.id = r.pilot_id
      GROUP BY p.id
      ORDER BY total_points DESC
      LIMIT 10
    `);

    let reply = "🏆 **Classement Cyclone** 🏆\n\n";

    rows.forEach((pilot, index) => {
      reply += `${index + 1}. ${pilot.name} - ${pilot.total_points} pts\n`;
    });

    message.channel.send(reply);
  }
});

client.login(process.env.TOKEN);