const { Client, GatewayIntentBits } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType
} = require('@discordjs/voice');

const ffmpegPath = require('ffmpeg-static');
const ytDlp = require('yt-dlp-exec');
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
// 🎵 再生処理
// ==========================
async function playNext(message) {
  if (queue.length === 0) {
    playing = false;
    return;
  }

  const url = queue.shift();
  playing = true;

  console.log('[PLAY]', url);

  // yt-dlp（安定ストリーム）
  const yt = spawn('node', [
    '-e',
    `
    const ytDlp = require('yt-dlp-exec');
    ytDlp.raw('${url}', { format: 'bestaudio' }).stdout.pipe(process.stdout);
    `
  ]);

  // ffmpeg（discord用opus）
  const ffmpeg = spawn(ffmpegPath, [
    '-i', 'pipe:0',
    '-acodec', 'libopus',
    '-f', 'opus',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1'
  ]);

  yt.stdout.pipe(ffmpeg.stdin);

  yt.stderr.on('data', d => console.log('[yt-dlp]', d.toString()));
  ffmpeg.stderr.on('data', d => console.log('[ffmpeg]', d.toString()));

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Opus
  });

  player.play(resource);

  if (message) {
    message.channel.send(`▶ 再生中: ${url}`);
  }
}

// ==========================
// 🔁 自動次曲
// ==========================
player.on(AudioPlayerStatus.Idle, () => {
  playing = false;
  playNext();
});

player.on('error', err => {
  console.error('[PLAYER ERROR]', err);
  playing = false;
  playNext();
});

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

  // 再生追加
  if (message.content.startsWith('!play ')) {
    const url = message.content.split(' ')[1];

    queue.push(url);
    message.reply(`キュー追加 📋 (${queue.length})`);

    if (!playing) {
      playNext(message);
    }
  }

  // スキップ
  if (message.content === '!skip') {
    player.stop();
    message.reply('スキップ ⏭');
  }

  // 停止
  if (message.content === '!stop') {
    queue = [];
    playing = false;
    player.stop();
    message.reply('停止した 🛑');
  }

  // 退出
  if (message.content === '!leave') {
    if (connection) connection.destroy();
    queue = [];
    playing = false;
    message.reply('VC抜けた 👋');
  }
});

// ==========================
// 起動
// ==========================
client.once('ready', () => {
  console.log(`ログイン成功: ${client.user.tag}`);
});

// ==========================
// TOKEN
// ==========================
client.login(process.env.DISCORD_TOKEN);
