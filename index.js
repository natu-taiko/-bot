const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection
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

let queue = [];
let playing = false;

// ==========================
// 🎵 再生（安定版）
// ==========================
function playNext(message) {
  if (queue.length === 0) {
    playing = false;
    return;
  }

  const url = queue.shift();
  playing = true;

  // 🔽 YouTube取得（安定format）
  const yt = spawn('yt-dlp', [
    '-f', 'bestaudio[ext=opus]/bestaudio',
    '-o', '-',
    url
  ]);

  // 🔽 ffmpeg（Discord用opus変換）
  const ffmpeg = spawn('ffmpeg', [
    '-i', 'pipe:0',
    '-f', 'opus',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ]);

  yt.stdout.pipe(ffmpeg.stdin);

  // 🔍 デバッグ（重要）
  yt.stderr.on('data', d => console.log('[yt-dlp]', d.toString()));
  ffmpeg.stderr.on('data', d => console.log('[ffmpeg]', d.toString()));

  ffmpeg.on('error', console.error);
  yt.on('error', console.error);

  const resource = createAudioResource(ffmpeg.stdout);
  player.play(resource);

  message.channel.send(`▶ 再生中: ${url}`);
}

// ==========================
// 🎧 コマンド
// ==========================
client.on('messageCreate', async (message) => {
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

  // 🎵 再生追加
  if (message.content.startsWith('!play ')) {
    const url = message.content.split(' ')[1];
    if (!url) return message.reply('URL入れて');

    queue.push(url);
    message.reply(`キュー追加 📋 (${queue.length})`);

    if (!playing) playNext(message);
  }

  // ⏭ スキップ
  if (message.content === '!skip') {
    player.stop();
    message.reply('スキップ ⏭');

    setTimeout(() => playNext(message), 500);
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

    connection = null;
    queue = [];
    playing = false;

    message.reply('VC抜けた 👋');
  }
});

// ==========================
// 🤖 起動
// ==========================
client.once('ready', () => {
  console.log(`ログイン成功: ${client.user.tag}`);
});

// ==========================
// 🔐 TOKEN
// ==========================
client.login(process.env.DISCORD_TOKEN);
