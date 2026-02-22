const tg = window.Telegram.WebApp;
tg.expand();

let userData;
let telegramId = tg.initDataUnsafe.user?.id;
let username = tg.initDataUnsafe.user?.username || "Player";
let ref = new URLSearchParams(window.location.search).get("start");

async function login() {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, username, ref })
  });
  userData = await res.json();
  updateUI();
}

function updateUI() {
  document.getElementById("balance").innerText = "Монеты: " + userData.coins;
  document.getElementById("ref").innerText =
    "Реферальная ссылка: https://t.me/dangerline_bot?start=" + telegramId;
}

async function clickCoin() {
  const res = await fetch("/api/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId })
  });
  const data = await res.json();
  userData.coins = data.coins;
  updateUI();
}

async function openCase(type) {
  const res = await fetch("/api/case", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, type })
  });
  const data = await res.json();
  if (data.error) return alert(data.error);
  alert("Вы выиграли " + data.reward + " монет!");
  userData.coins = data.coins;
  updateUI();
}

login();