require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB подключена"))
.catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  telegramId: String,
  username: String,
  coins: { type: Number, default: 1000 },
  referrals: { type: Number, default: 0 },
  referredBy: String
});

const User = mongoose.model("User", userSchema);

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

app.post("/api/click", async (req, res) => {
  const { telegramId } = req.body;
  const user = await User.findOne({ telegramId });
  user.coins += 1;
  await user.save();
  res.json({ coins: user.coins });
});

app.post("/api/case", async (req, res) => {
  const { telegramId, type } = req.body;
  const user = await User.findOne({ telegramId });

  const prices = { common: 100, rare: 500, legendary: 1000 };
  if (user.coins < prices[type]) return res.json({ error: "Недостаточно монет" });

  user.coins -= prices[type];

  let reward = 0;
  if (type === "common") reward = Math.floor(Math.random() * 200) + 50;
  if (type === "rare") reward = Math.floor(Math.random() * 700) + 200;
  if (type === "legendary") reward = Math.floor(Math.random() * 2000) + 500;

  user.coins += reward;
  await user.save();

  res.json({ reward, coins: user.coins });
});

app.listen(3000, () => console.log("Сервер запущен на 3000"));