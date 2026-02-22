require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* =========================
   DATABASE
========================= */

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB подключена"))
.catch(err => console.log(err));

/* =========================
   SCHEMAS
========================= */

const userSchema = new mongoose.Schema({
  telegramId: String,
  username: String,
  coins: { type: Number, default: 1000 },
  referrals: { type: Number, default: 0 },
  referredBy: String,
  lastClick: { type: Number, default: 0 },
  lastGame: { type: Number, default: 0 }
});

const historySchema = new mongoose.Schema({
  telegramId: String,
  game: String,
  bet: Number,
  result: Number,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const History = mongoose.model("History", historySchema);

/* =========================
   LOGIN + REFERRAL
========================= */

app.post("/api/login", async (req, res) => {
  const { telegramId, username, ref } = req.body;

  let user = await User.findOne({ telegramId });

  if (!user) {
    user = new User({ telegramId, username });

    if (ref && ref !== telegramId) {
      const refUser = await User.findOne({ telegramId: ref });
      if (refUser) {
        refUser.coins += 500;
        refUser.referrals += 1;
        await refUser.save();

        user.coins += 200;
        user.referredBy = ref;
      }
    }

    await user.save();
  }

  res.json(user);
});

/* =========================
   CLICKER +0.1 (ANTI ABUSE)
========================= */

app.post("/api/click", async (req, res) => {
  const { telegramId } = req.body;
  const user = await User.findOne({ telegramId });

  const now = Date.now();

  if (now - user.lastClick < 1000)
    return res.json({ error: "Too fast" });

  user.lastClick = now;
  user.coins += 0.1;

  await user.save();

  res.json({ coins: user.coins });
});

/* =========================
   ROULETTE
========================= */

app.post("/api/roulette", async (req, res) => {
  const { telegramId, bet, type, value } = req.body;
  const user = await User.findOne({ telegramId });

  if (!bet || bet <= 0)
    return res.json({ error: "Неверная ставка" });

  if (user.coins < bet)
    return res.json({ error: "Недостаточно монет" });

  const now = Date.now();
  if (now - user.lastGame < 3000)
    return res.json({ error: "Подождите 3 секунды" });

  user.lastGame = now;
  user.coins -= bet;

  const number = Math.floor(Math.random() * 37);
  const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

  let win = 0;

  if (type === "number" && number === value) win = bet * 35;
  if (type === "red" && reds.includes(number)) win = bet * 2;
  if (type === "black" && !reds.includes(number) && number !== 0) win = bet * 2;

  user.coins += win;
  await user.save();

  await History.create({
    telegramId,
    game: "roulette",
    bet,
    result: win - bet
  });

  res.json({
    number,
    win,
    coins: user.coins
  });
});

/* =========================
   CASES
========================= */

app.post("/api/case", async (req, res) => {
  const { telegramId, type } = req.body;
  const user = await User.findOne({ telegramId });

  const prices = {
    common: 100,
    rare: 500,
    legendary: 1000
  };

  if (!prices[type])
    return res.json({ error: "Неверный тип кейса" });

  if (user.coins < prices[type])
    return res.json({ error: "Недостаточно монет" });

  const now = Date.now();
  if (now - user.lastGame < 3000)
    return res.json({ error: "Подождите 3 секунды" });

  user.lastGame = now;
  user.coins -= prices[type];

  let reward = 0;

  if (type === "common")
    reward = Math.floor(Math.random() * 200) + 50;

  if (type === "rare")
    reward = Math.floor(Math.random() * 700) + 200;

  if (type === "legendary")
    reward = Math.floor(Math.random() * 2000) + 500;

  user.coins += reward;

  await user.save();

  await History.create({
    telegramId,
    game: "case_" + type,
    bet: prices[type],
    result: reward - prices[type]
  });

  res.json({
    reward,
    coins: user.coins
  });
});

/* =========================
   LEADERBOARD
========================= */

app.get("/api/leaderboard", async (req, res) => {
  const users = await User.find()
    .sort({ coins: -1 })
    .limit(10)
    .select("username coins");

  res.json(users);
});

/* =========================
   GAME HISTORY
========================= */

app.get("/api/history/:telegramId", async (req, res) => {
  const history = await History.find({
    telegramId: req.params.telegramId
  })
  .sort({ createdAt: -1 })
  .limit(20);

  res.json(history);
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Сервер запущен на " + PORT);
});
