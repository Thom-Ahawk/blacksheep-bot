require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

console.log("=== TEST SANS MYSQL ===");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`🤖 Bot connecté : ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    message.reply("pong");
  }
});

if (!process.env.TOKEN) {
  console.error("TOKEN manquant !");
  process.exit(1);
}

client.login(process.env.TOKEN);