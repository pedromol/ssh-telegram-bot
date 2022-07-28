## Description

  A Telegram Bot to connect to a SSH server.

## Requirements
- [Node v18+](https://github.com/nvm-sh/nvm)
- [Git](https://git-scm.com/)
- [Telegram Bot Token](https://core.telegram.org/bots#3-how-do-i-create-a-bot). **This must be kept as a password. Do not share or publish this token.**

## Installation

```bash
$ npm install
```

## Running the app

| Enviroment variable | Function |
| :----: | --- |
| `TELEGRAM_ALLOWED_USERNAMES` | Semicolon separated list of allowed Telegram usernames to interact with the bot |
| `TELEGRAM_TOKEN` | [Telegram Bot Token](https://core.telegram.org/bots#3-how-do-i-create-a-bot). **This must be kept as a password. Do not share or publish this token.** |
| `SSH_HOST` | SSH target hostname or IP address |
| `SSH_USERNAME` | SSH username |
| `SSH_KEY` | **Use this or SSH_PASSWORD** Path to SSH key for given username |
| `SSH_PASSWORD` | **Use this or SSH_KEY** SSH password for given username |

```bash
$ export TELEGRAM_ALLOWED_USERNAMES="SEMICOLON_SEPARATED_USERNAMES"
$ export TELEGRAM_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
$ export SSH_HOST="SSH_TARGET_IP_OR_HOSTNAME"
$ export SSH_USERNAME="SSH_USERNAME"
$ export SSH_KEY="SSH_KEY_PATH"
$ npm start
```

## Using docker-compose
```bash
version: "3.5"

services:
  ssh-telegram-bot:
    container_name: ssh-telegram-bot
    image: pedromol/ssh-telegram-bot
    volumes:
      - "/root/.ssh:/keys"
    environment:
      - "TELEGRAM_ALLOWED_USERNAMES=SEMICOLON_SEPARATED_USERNAMES"
      - "TELEGRAM_TOKEN=YOUR_TELEGRAM_BOT_TOKEN"
      - "SSH_HOST=SSH_TARGET_IP_OR_HOSTNAME"
      - "SSH_USERNAME=SSH_USERNAME"
      - "SSH_KEY=SSH_KEY_PATH" #Use this or SSH_PASSWORD bellow
    #   - "SSH_PASSWORD=SSH_PASSWORD_FOR_USERNAME"
      - "NODE_DISABLE_COLORS=1"
    restart: unless-stopped
```

## License

[MIT licensed](LICENSE).