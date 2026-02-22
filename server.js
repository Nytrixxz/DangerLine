const tg = window.Telegram.WebApp;
tg.expand();

let userData;
let telegramId = tg.initDataUnsafe.user?.id;
let username = tg.initDataUnsafe.user?.username || "Player";

document.getElementById("username").innerText = "@" + username;

async function login(){
  const res = await fetch("/api/login",{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({telegramId, username})
  });
  userData = await res.json();
  updateUI();

  document.getElementById("loader").style.display="none";
  document.getElementById("app").classList.remove("hidden");
}

function updateUI(){
  document.getElementById("balance").innerText="Монеты: "+userData.coins.toFixed(1);
  document.getElementById("ref").innerText=
  "https://t.me/dangerline_bot?start="+telegramId;
}

function openScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  if(id==="leaderboard") loadLeaderboard();
}

async function clickCoin(){
  const res = await fetch("/api/click",{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({telegramId})
  });

  const data = await res.json();
  if(data.coins){
    userData.coins=data.coins;
    updateUI();
  }
}

async function playRoulette(){
  const bet = Number(document.getElementById("betAmount").value);
  const type = document.getElementById("betType").value;

  const res = await fetch("/api/roulette",{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({telegramId, bet, type})
  });

  const data = await res.json();
  if(data.error) return alert(data.error);

  document.getElementById("wheel").style.transform=
  `rotate(${3600 + data.number*10}deg)`;

  setTimeout(()=>{
    userData.coins=data.coins;
    updateUI();
    document.getElementById("rouletteResult").innerText=
    "Выпало: "+data.number+" | Выигрыш: "+data.win;
  },3000);
}

async function openCase(type){
  const res = await fetch("/api/case",{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({telegramId, type})
  });

  const data = await res.json();
  if(data.error) return alert(data.error);

  document.getElementById("caseResult").innerText=
  "Вы получили "+data.reward;

  userData.coins=data.coins;
  updateUI();
}

async function loadLeaderboard(){
  const res = await fetch("/api/leaderboard");
  const users = await res.json();

  const list=document.getElementById("leaders");
  list.innerHTML="";
  users.forEach(u=>{
    const li=document.createElement("li");
    li.innerText=u.username+" — "+u.coins.toFixed(1);
    list.appendChild(li);
  });
}

login();
