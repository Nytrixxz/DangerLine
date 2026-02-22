require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start (.+)/, (msg, match) => {
  const ref = match[1];
  bot.sendMessage(msg.chat.id, "Добро пожаловать в DangerLine 🎰", {
    reply_markup: {
      inline_keyboard: [[
        {
          text: "Открыть приложение",
          web_app: { url: "https://ТВОЙ-RENDER-URL.onrender.com" }
        }
      ]]
    }
  });
});

bot.onText(/\/start$/, (msg) => {
  bot.sendMessage(msg.chat.id, "Добро пожаловать в DangerLine 🎰", {
    reply_markup: {
      inline_keyboard: [[
        {
          text: "Открыть приложение",
          web_app: { url: "https://ТВОЙ-RENDER-URL.onrender.com" }
        }
      ]]
    }
  });
});