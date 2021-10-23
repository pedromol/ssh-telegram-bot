const TelegramBot = require("node-telegram-bot-api");
const { NodeSSH } = require("node-ssh");

const token = process.env["TELEGRAM_TOKEN"];

const bot = new TelegramBot(token, { polling: true });
const ssh = new NodeSSH();

const channels = {};

const getChannel = async (chatId) => {
  if (channels[chatId]) {
    if (!channels[chatId].connection.isConnected()) {
      await removeChannel(chatId);
      return getChannel(chatId);
    }
    return channels[chatId];
  }

  channels[chatId] = {};
  channels[chatId].connection = await ssh.connect({
    host: process.env['SSH_HOST'],
    username: process.env['SSH_USERNAME'],
    privateKey: process.env['SSH_KEY'],
    password: process.env['SSH_PASSWORD'],
    port: process.env['SSH_PORT'] || 22,
  });

  channels[chatId].shell = await ssh.requestShell();

  channels[chatId].shell.on("data", (data) => {
    if (!data || !data.toString().trim().length) return;
    bot.sendMessage(chatId, data.toString());
  });

  channels[chatId].shell.stderr.on("data", (data) => {
    if (!data || !data.toString().trim().length) return;
    bot.sendMessage(chatId, data.toString());
  });

  return channels[chatId];
};

const removeChannel = async (chatId) => {
  if (!channels[chatId]) return;

  if (channels[chatId].shell) {
    channels[chatId].shell.signal("KILL");
    Reflect.deleteProperty(channels[chatId], "shell");
  }

  if (channels[chatId].connection) {
    if (channels[chatId].connection.isConnected()) channels[chatId].connection.dispose();
    Reflect.deleteProperty(channels[chatId], "connection");
  }

  Reflect.deleteProperty(channels, chatId);
};

bot.on("message", (msg) => {
  if (msg.from.username !== process.env['TELEGRAM_ALLOWED_USERNAME']) {
    return;
  }

  chatId = msg.chat.id;

  if (msg.text === "!reset") {
    const chatId = msg.chat.id;
    return removeChannel(chatId);
  }

  return getChannel(chatId).then((channel) => channel.shell.write(msg.text.trim() + "\n"));
});
