const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  AudioPlayerStatus
} = require('@discordjs/voice');

const { spawn } = require('child_process');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

let connection = null;
const player = createAudioPlayer();

// 📋 キュー
let queue = [];
let playing = false;

// 🎵 再生処理
function playNext(message) {
  if (queue.length === 0) {
    playing = false;
    return;
  }

  const url = queue.shift();
  playing = true;

  // ✅ Railway対応（Windows exe削除）
  const yt = spawn('yt-dlp', [
    '-f', 'bestaudio',
    '-o', '-',
    url
  ]);

  yt.stderr.on('data', (data) => {
    console.log(`yt-dlp error: ${data}`);
  });

  const resource = createAudioResource(yt.stdout);
  player.play(resource);

  message.channel.send(`▶ 再生中: ${url}`);
}

// 🎧 メッセージ処理
client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  // VC参加
  if (message.content === '!join') {
    const channel = message.member.voice.channel;
    if (!channel) return message.reply('VC入って');

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    connection.subscribe(player);
    return message.reply('VC入った 👍');
  }

  // 📋 キュー追加
  if (message.content.startsWith('!play ')) {
    const url = message.content.split(' ')[1];
    if (!url) return message.reply('URL入れて');

    queue.push(url);
    message.reply(`キュー追加 📋 (${queue.length}曲)`);

    if (!playing) {
      playNext(message);
    }
  }

  // ⏭ スキップ
  if (message.content === '!skip') {
    player.stop();
    message.reply('スキップ ⏭');

    setTimeout(() => {
      playNext(message);
    }, 500);
  }

  // 🛑 停止
  if (message.content === '!stop') {
    queue = [];
    playing = false;
    player.stop();
    message.reply('停止した 🛑');
  }

  // 🚪退出
  if (message.content === '!leave') {
    const conn = getVoiceConnection(message.guild.id);
    if (conn) conn.destroy();

    queue = [];
    playing = false;

    message.reply('VC抜けた 👋');
  }
});

// 🎶 曲終了時
player.on(AudioPlayerStatus.Idle, () => {
  if (playing) return;
});

// 🤖 起動
client.once('ready', () => {
  console.log(`ログイン成功: ${client.user.tag}`);
});

// 🔐 Railway環境変数対応（ここ重要）
client.login(process.env.DISCORD_TOKEN);
