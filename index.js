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

let queue = [];
let playing = false;

// 🎵 YouTube再生
function playNext(message) {
  if (queue.length === 0) {
    playing = false;
    return;
  }

  const url = queue.shift();
  playing = true;

  const yt = spawn('yt-dlp', [
    '-f', 'bestaudio',
    '-o', '-',
    url
  ]);

  const resource = createAudioResource(yt.stdout);
  player.play(resource);

  message.channel.send(`▶ 再生中: ${url}`);
}

// 🔇 VC維持（無音ループ）
function startKeepAlive() {
  setInterval(() => {
    if (!connection) return;

    const ffmpeg = spawn('ffmpeg', [
      '-f', 'lavfi',
      '-i', 'anullsrc=r=48000:cl=stereo',
      '-t', '5',
      '-f', 'opus',
      'pipe:1'
    ]);

    const resource = createAudioResource(ffmpeg.stdout);
    player.play(resource);

  }, 25000); // 25秒ごとに無音再生
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

    startKeepAlive(); // 🔥 VC維持開始

    return message.reply('VC入った & 維持開始 👍');
  }

  // 📋 再生
  if (message.content.startsWith('!play ')) {
    const url = message.content.split(' ')[1];
    queue.push(url);

    message.reply(`キュー追加 📋 (${queue.length})`);

    if (!playing) playNext(message);
  }

  // ⏭ スキップ
  if (message.content === '!skip') {
    player.stop();
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

// 🤖 起動
client.once('ready', () => {
  console.log(`ログイン成功: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
