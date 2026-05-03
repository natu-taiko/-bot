const { Client, GatewayIntentBits } = require('discord.js');

// ==========================
// 🤖 Bot本体
// ==========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ==========================
// 🚀 起動時
// ==========================
client.once('ready', () => {
  console.log(`✅ ログイン成功: ${client.user.tag}`);
});

// ==========================
// 💬 メッセージ反応
// ==========================
client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  // pingテスト
  if (message.content === '!ping') {
    message.reply('pong 🟢');
  }

  // helloテスト
  if (message.content === '!hello') {
    message.reply('こんにちは 👋 Bot動いてるよ');
  }
});

// ==========================
// 🔐 ログイン
// ==========================
client.login(process.env.DISCORD_TOKEN);
