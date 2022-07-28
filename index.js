const validateEnv = () => {
    const requiredEnv = ['TELEGRAM_TOKEN', 'SSH_HOST', 'SSH_USERNAME', 'TELEGRAM_ALLOWED_USERNAMES'].find(
        (env) => !process.env[env],
    );
    if (requiredEnv) {
        throw new Error(`Missing ${requiredEnv} enviroment variable`);
    }

    const xorEnv = ['SSH_KEY', 'SSH_PASSWORD'].some((env) => !!process.env[env]);
    if (!xorEnv) {
        throw new Error('At least one of SSH_KEY or SSH_PASSWORD enviroment variable should be set');
    }
};

validateEnv();

import TelegramBot from 'node-telegram-bot-api';
import { NodeSSH } from 'node-ssh';
import stripAnsi from 'strip-ansi';

const bot = new TelegramBot(process.env['TELEGRAM_TOKEN'], { polling: true });
const ssh = new NodeSSH();

const channels = {};
const allowedUsers = process.env['TELEGRAM_ALLOWED_USERNAMES'].split(';');
const debouncerTimeout = process.env['DEBOUNCER_TIMEOUT'] ?? 1000;

const getChannel = async (msg) => {
    const chatId = msg.chat.id;
    if (channels[chatId]) {
        if (!channels[chatId].connection.isConnected()) {
            await removeChannel(chatId);
            return getChannel(chatId);
        }
        return channels[chatId];
    }

    console.log(`Starting session for ${msg.from.username}`);

    channels[chatId] = {};
    channels[chatId].connection = await ssh.connect({
        host: process.env['SSH_HOST'],
        username: process.env['SSH_USERNAME'],
        privateKeyPath: process.env['SSH_KEY'],
        password: process.env['SSH_PASSWORD'],
        port: process.env['SSH_PORT'] || 22,
    });

    channels[chatId].shell = await ssh.requestShell();

    channels[chatId].shell.on('data', (data) => {
        if (!data?.toString().trim().length) return;
        const message = stripAnsi(data?.toString());
        channels[chatId].buffer = `${channels[chatId].buffer ?? ''}${message}`;
        if (!channels[chatId].debouncer) {
          channels[chatId].debouncer = setTimeout(() => {
            bot.sendMessage(chatId, channels[chatId].buffer);
            channels[chatId].buffer = '';
            channels[chatId].debouncer = undefined;
          }, debouncerTimeout);
        }
    });

    channels[chatId].shell.stderr.on('data', (data) => {
      if (!data?.toString().trim().length) return;
      const message = stripAnsi(data?.toString());
      channels[chatId].buffer = `${channels[chatId].buffer ?? ''}${message}`;
      if (!channels[chatId].debouncer) {
        channels[chatId].debouncer = setTimeout(() => {
          bot.sendMessage(chatId, channels[chatId].buffer);
          channels[chatId].buffer = '';
          channels[chatId].debouncer = undefined;
        }, debouncerTimeout);
      }
    });

    return channels[chatId];
};

const removeChannel = async (chatId) => {
    if (!channels[chatId]) return;

    if (channels[chatId].shell) {
        channels[chatId].shell.signal('KILL');
        Reflect.deleteProperty(channels[chatId], 'shell');
    }

    if (channels[chatId].connection) {
        if (channels[chatId].connection.isConnected()) channels[chatId].connection.dispose();
        Reflect.deleteProperty(channels[chatId], 'connection');
    }

    Reflect.deleteProperty(channels, chatId);
};

bot.on('message', (msg) => {
    if (!allowedUsers.includes(msg.from.username)) {
        console.log(`Ignoring message from user not present in TELEGRAM_ALLOWED_USERNAMES : ${msg.from.username}`);
        return;
    }

    if (msg.text === '!exit') {
        console.log(`Closing session for ${msg.from.username}`);
        const chatId = msg.chat.id;
        return removeChannel(chatId);
    }

    return getChannel(msg).then((channel) => channel.shell.write(msg.text.trim() + '\n'));
});

const printCrash = (err) => {
    console.error('node-telegram-bot-api error : ', err);
    process.exit(1);
}

bot.on('error', printCrash);
bot.on('polling_error', printCrash);
bot.on('webhook_error', printCrash);

console.log(`Starting ssh-telegram-bot with parameters
Host : ${process.env['SSH_HOST']}
User : ${process.env['SSH_USERNAME']}
Auth : ${process.env['SSH_PASSWORD'] ? 'Password' : 'Key'}

Allowed users names : ${allowedUsers}
`);
