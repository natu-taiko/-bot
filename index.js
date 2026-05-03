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

// 🎵 次の曲を再生
function playNext(message) {
  if (queue.length === 0) {
    playing = false;
    return;
  }

  const url = queue.shift();
  playing = true;

  const yt = spawn('.\\yt-dlp.exe', [
    '-f', 'bestaudio',
    '-o', '-',
    url
  ]);

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

    queue.push(url);
    message.reply(`キュー追加した 📋 (${queue.length}曲)`);

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
    player.stop();
    playing = false;
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

// 🎶 再生が終わったら次へ
player.on(AudioPlayerStatus.Idle, () => {
  // 次の曲再生
});

client.once('ready', () => {
  console.log(`ログイン成功: ${client.user.tag}`);
});

client.login(process.env.TOKEN);