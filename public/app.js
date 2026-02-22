// app.js
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
} else {
    console.log('Работаем вне Telegram');
}

let userData = null;
let telegramId = tg?.initDataUnsafe?.user?.id;
let username = tg?.initDataUnsafe?.user?.username || "Игрок";
let ref = new URLSearchParams(window.location.search).get("start");

// Если нет telegramId (локально), генерируем
if (!telegramId) {
    telegramId = 'local_' + Math.random().toString(36).substr(2, 9);
}

// DOM элементы
const loader = document.getElementById('loader');
const main = document.getElementById('main');
const balanceSpan = document.getElementById('balance');
const usernameSpan = document.getElementById('username');
const profileNameSpan = document.getElementById('profile-name');
const profileIdSpan = document.getElementById('profile-id');
const profileBalanceSpan = document.getElementById('profile-balance');
const dailyBonusBtn = document.getElementById('daily-bonus-btn');
const refLinkInput = document.getElementById('ref-link');
const refCountSpan = document.getElementById('ref-count');
const refEarnedSpan = document.getElementById('ref-earned');
const refListUl = document.getElementById('ref-list');
const copyRefBtn = document.getElementById('copy-ref');
const leadersContainer = document.getElementById('leaders-container');
const caseButtons = document.querySelectorAll('.open-case-btn');
const rouletteSpin = document.getElementById('roulette-spin');
const rouletteBet = document.getElementById('roulette-bet');
const rouletteResult = document.getElementById('roulette-result');
const blackjackPlay = document.getElementById('blackjack-play');
const blackjackHit = document.getElementById('blackjack-hit');
const blackjackStand = document.getElementById('blackjack-stand');
const blackjackResult = document.getElementById('blackjack-result');
const dealerCardsDiv = document.getElementById('dealer-cards');
const playerCardsDiv = document.getElementById('player-cards');
const dealerSumSpan = document.getElementById('dealer-sum');
const playerSumSpan = document.getElementById('player-sum');
const clickerCoin = document.getElementById('clicker-coin');
const clickerEarned = document.getElementById('clicker-earned');
const clickRewardSpan = document.getElementById('click-reward');
const clicksLeftSpan = document.getElementById('clicks-left');
const clicksMaxSpan = document.getElementById('clicks-max');
const clickProgress = document.getElementById('click-progress');
const buyVipBtn = document.getElementById('buy-vip-btn');
const screens = document.querySelectorAll('.screen');
const navBtns = document.querySelectorAll('.nav-btn');

// --- Состояние приложения ---
let vip = false;
let lastBonusTime = 0;
let selectedColor = 'red';
let playerHand = [], dealerHand = [], gameActive = false;
let clickCountHour = 0, lastClickResetTime = Date.now();
let referrals = []; // список рефералов

// --- Вспомогательные функции ---
function showMessage(msg) {
    if (tg) tg.showAlert(msg); else alert(msg);
}

function formatCoins(coins) {
    return Math.floor(coins);
}

function updateUI() {
    if (!userData) return;
    balanceSpan.innerText = formatCoins(userData.coins);
    usernameSpan.innerText = username;
    profileNameSpan.innerHTML = username + (vip ? '<span class="vip-badge">VIP</span>' : '');
    profileIdSpan.innerText = `ID: ${telegramId}`;
    profileBalanceSpan.innerText = formatCoins(userData.coins);
    
    // Кнопка бонуса только для VIP
    if (vip) {
        dailyBonusBtn.classList.remove('hidden');
    } else {
        dailyBonusBtn.classList.add('hidden');
    }
    
    // Реферальная ссылка
    const refLink = `https://t.me/dangerline_bot?start=${telegramId}`;
    refLinkInput.value = refLink;
    
    // Обновляем кликер
    updateClickerUI();
}

// --- Загрузка данных с сервера ---
async function login() {
    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramId, username, ref })
        });
        if (!res.ok) throw new Error('Ошибка сети');
        userData = await res.json();
        // Предполагаем, что сервер возвращает { coins, referrals, vip, lastBonusTime }
        vip = userData.vip || false;
        lastBonusTime = userData.lastBonusTime || 0;
        referrals = userData.referralsList || []; // список имён приглашённых
    } catch (error) {
        console.error('Login failed, using local data', error);
        userData = { coins: 1000, referrals: 2 };
        vip = false;
        referrals = ['user1', 'user2'];
    } finally {
        updateUI();
        renderReferrals();
        loader.classList.add('hidden');
        main.classList.remove('hidden');
        loadLeaderboard(); // загружаем топ
        updateClickerLimits();
    }
}

// --- Рефералы ---
function renderReferrals() {
    refCountSpan.innerText = referrals.length;
    refEarnedSpan.innerText = referrals.length * 500;
    let html = '';
    referrals.forEach(name => {
        html += `<li class="ref-item">${name} <span class="ref-bonus">+500</span></li>`;
    });
    if (referrals.length === 0) html = '<li class="ref-item">Пока никого</li>';
    refListUl.innerHTML = html;
}

copyRefBtn.addEventListener('click', () => {
    refLinkInput.select();
    navigator.clipboard.writeText(refLinkInput.value).then(() => {
        showMessage('Ссылка скопирована!');
    }).catch(() => {
        showMessage('Не удалось скопировать');
    });
});

// --- Лидеры (реальные) ---
async function loadLeaderboard() {
    try {
        const res = await fetch("/api/leaders");
        if (!res.ok) throw new Error('Ошибка загрузки топа');
        const leaders = await res.json();
        renderLeaders(leaders);
    } catch (error) {
        console.error('Leaderboard error, using mock', error);
        // Заглушка на случай отсутствия эндпоинта
        const mockLeaders = [
            { name: 'CryptoKing', score: 15000, vip: true },
            { name: 'LuckyOne', score: 12000, vip: false },
            { name: 'Player123', score: 9000, vip: true },
        ];
        renderLeaders(mockLeaders);
    }
}

function renderLeaders(leaders) {
    let html = '';
    leaders.forEach((leader, index) => {
        html += `
            <div class="leader-item">
                <div class="leader-rank">#${index+1}</div>
                <div class="leader-avatar"></div>
                <div class="leader-info">
                    <div class="leader-name">
                        ${leader.name}
                        ${leader.vip ? '<span class="vip-badge-small">VIP</span>' : ''}
                    </div>
                    <div class="leader-score">${leader.score} монет</div>
                </div>
            </div>
        `;
    });
    leadersContainer.innerHTML = html;
}

// --- Навигация ---
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetScreen = btn.dataset.screen;
        navBtns.forEach(b => b.classList.remove('active'));
        screens.forEach(s => s.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(`${targetScreen}-screen`).classList.add('active');
    });
});

// --- Ежедневный бонус (только для VIP) ---
dailyBonusBtn.addEventListener('click', async () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - lastBonusTime < oneDay) {
        const hoursLeft = Math.ceil((oneDay - (now - lastBonusTime)) / (60*60*1000));
        showMessage(`Бонус можно будет взять через ${hoursLeft} ч.`);
        return;
    }
    
    try {
        const res = await fetch("/api/daily-bonus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramId })
        });
        if (!res.ok) throw new Error('Ошибка');
        const data = await res.json();
        userData.coins = data.coins;
        lastBonusTime = Date.now();
        updateUI();
        showMessage(`🎉 Вы получили ${data.bonus} монет!`);
    } catch (error) {
        // Локальная имитация
        const bonus = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;
        userData.coins += bonus;
        lastBonusTime = now;
        updateUI();
        showMessage(`🎉 Вы получили ${bonus} монет! (локально)`);
    }
});

// --- Кейсы ---
caseButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const caseCard = e.target.closest('.case-card');
        const type = caseCard.dataset.type;
        openCase(type, caseCard);
    });
});

async function openCase(type, caseCard) {
    const prices = { common: 100, rare: 500, legendary: 1000 };
    if (userData.coins < prices[type]) {
        showMessage('Недостаточно монет');
        return;
    }
    
    caseCard.classList.add('opening');
    userData.coins -= prices[type];
    updateUI();
    
    try {
        const res = await fetch("/api/case", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramId, type })
        });
        const data = await res.json();
        if (data.error) {
            showMessage(data.error);
            return;
        }
        userData.coins = data.coins;
        updateUI();
        showMessage(`✨ Вы выиграли ${data.reward} монет!`);
    } catch (error) {
        // Локальная имитация
        setTimeout(() => {
            caseCard.classList.remove('opening');
            let reward = 0;
            const rand = Math.random();
            if (type === 'common') {
                if (rand < 0.5) reward = Math.floor(Math.random() * 50) + 50;
                else if (rand < 0.8) reward = Math.floor(Math.random() * 100) + 150;
                else reward = Math.floor(Math.random() * 300) + 300;
            } else if (type === 'rare') {
                if (rand < 0.4) reward = Math.floor(Math.random() * 200) + 300;
                else if (rand < 0.7) reward = Math.floor(Math.random() * 300) + 600;
                else reward = Math.floor(Math.random() * 500) + 1000;
            } else {
                if (rand < 0.3) reward = Math.floor(Math.random() * 500) + 1000;
                else if (rand < 0.6) reward = Math.floor(Math.random() * 1000) + 1500;
                else reward = Math.floor(Math.random() * 3000) + 2500;
            }
            userData.coins += reward;
            updateUI();
            showMessage(`✨ Вы выиграли ${reward} монет! (локально)`);
            caseCard.style.boxShadow = '0 0 30px gold';
            setTimeout(() => caseCard.style.boxShadow = '', 500);
        }, 600);
    }
}

// --- Рулетка ---
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedColor = btn.dataset.color;
    });
});

rouletteSpin.addEventListener('click', () => {
    let bet = parseInt(rouletteBet.value);
    if (isNaN(bet) || bet < 10) bet = 10;
    if (bet > userData.coins) {
        showMessage('Недостаточно монет');
        return;
    }
    
    userData.coins -= bet;
    updateUI();

    const wheel = document.getElementById('roulette-wheel');
    wheel.classList.add('spinning');
    rouletteResult.innerText = 'Крутим...';

    setTimeout(() => {
        wheel.classList.remove('spinning');
        
        const rand = Math.random();
        let result;
        if (rand < 0.45) result = 'red';
        else if (rand < 0.9) result = 'black';
        else result = 'green';
        
        let winAmount = 0;
        if (result === selectedColor) {
            if (selectedColor === 'green') winAmount = bet * 14;
            else winAmount = bet * 2;
            userData.coins += winAmount;
            rouletteResult.innerText = `🎉 Выигрыш: ${winAmount} монет! (${result === 'red' ? 'красное' : result === 'black' ? 'чёрное' : 'зелёное'})`;
        } else {
            rouletteResult.innerText = `😞 Проигрыш. Выпало: ${result === 'red' ? 'красное' : result === 'black' ? 'чёрное' : 'зелёное'}`;
        }
        
        const segments = document.querySelectorAll('.wheel-segment');
        segments.forEach(seg => {
            if (seg.classList.contains(result)) {
                seg.style.transform = 'scale(1.3)';
                setTimeout(() => seg.style.transform = '', 500);
            }
        });
        
        updateUI();
    }, 2000);
});

// --- Блэкджек (с закрытой картой дилера) ---
function createCardElement(value, hidden = false) {
    const card = document.createElement('div');
    card.className = 'card';
    if (hidden) {
        card.classList.add('back');
        card.innerText = '';
    } else {
        const suits = ['♥', '♦', '♠', '♣'];
        const suit = suits[Math.floor(Math.random() * suits.length)];
        card.setAttribute('data-suit', suit);
        card.innerText = value + suit;
    }
    return card;
}

function renderBlackjack() {
    dealerCardsDiv.innerHTML = '';
    playerCardsDiv.innerHTML = '';
    
    // Для дилера: первая карта открыта, остальные скрыты, если игра активна
    dealerHand.forEach((card, index) => {
        if (gameActive && index === 1) {
            dealerCardsDiv.appendChild(createCardElement(card, true));
        } else {
            dealerCardsDiv.appendChild(createCardElement(card, false));
        }
    });
    
    playerHand.forEach(card => {
        playerCardsDiv.appendChild(createCardElement(card, false));
    });
    
    const dealerSum = gameActive ? '?' : calcHand(dealerHand);
    const playerSum = calcHand(playerHand);
    dealerSumSpan.innerText = dealerSum !== '?' ? `Сумма: ${dealerSum}` : '';
    playerSumSpan.innerText = playerSum ? `Сумма: ${playerSum}` : '';
}

function calcHand(hand) {
    let sum = hand.reduce((acc, card) => acc + card, 0);
    let aces = hand.filter(c => c === 11).length;
    while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
    }
    return sum;
}

function startBlackjack() {
    const bet = 10;
    if (userData.coins < bet) {
        showMessage('Недостаточно монет');
        return false;
    }
    userData.coins -= bet;
    updateUI();
    
    const deck = [2,3,4,5,6,7,8,9,10,10,10,10,11];
    playerHand = [];
    dealerHand = [];
    for (let i = 0; i < 2; i++) {
        playerHand.push(deck[Math.floor(Math.random() * deck.length)]);
        dealerHand.push(deck[Math.floor(Math.random() * deck.length)]);
    }
    gameActive = true;
    renderBlackjack();
    blackjackResult.innerText = '';
    
    if (calcHand(playerHand) === 21) {
        endBlackjack('blackjack');
    }
}

function endBlackjack(reason) {
    gameActive = false;
    const playerSum = calcHand(playerHand);
    let dealerSum = calcHand(dealerHand);
    
    if (reason === 'blackjack') {
        userData.coins += 25;
        blackjackResult.innerText = '🎉 Блэкджек! Вы выиграли 25 монет!';
    } else if (reason === 'bust') {
        blackjackResult.innerText = '😞 Перебор, вы проиграли';
    } else if (reason === 'stand') {
        const deck = [2,3,4,5,6,7,8,9,10,10,10,10,11];
        while (calcHand(dealerHand) < 17) {
            dealerHand.push(deck[Math.floor(Math.random() * deck.length)]);
        }
        renderBlackjack();
        dealerSum = calcHand(dealerHand);
        
        if (dealerSum > 21 || playerSum > dealerSum) {
            userData.coins += 20;
            blackjackResult.innerText = '🎉 Вы выиграли!';
        } else if (playerSum === dealerSum) {
            userData.coins += 10;
            blackjackResult.innerText = 'Ничья';
        } else {
            blackjackResult.innerText = '😞 Дилер выиграл';
        }
    }
    renderBlackjack();
    updateUI();
}

blackjackPlay.addEventListener('click', startBlackjack);
blackjackHit.addEventListener('click', () => {
    if (!gameActive) return;
    const deck = [2,3,4,5,6,7,8,9,10,10,10,10,11];
    playerHand.push(deck[Math.floor(Math.random() * deck.length)]);
    renderBlackjack();
    if (calcHand(playerHand) > 21) {
        endBlackjack('bust');
    }
});
blackjackStand.addEventListener('click', () => {
    if (!gameActive) return;
    endBlackjack('stand');
});

// --- Кликер ---
function updateClickerLimits() {
    const maxClicks = 200; // лимит всегда 200
    const period = vip ? 30 * 60 * 1000 : 60 * 60 * 1000; // 30 мин или 1 час
    
    const now = Date.now();
    if (now - lastClickResetTime > period) {
        clickCountHour = 0;
        lastClickResetTime = now;
    }
    
    const remaining = Math.max(0, maxClicks - clickCountHour);
    clicksLeftSpan.innerText = remaining;
    clicksMaxSpan.innerText = maxClicks;
    clickRewardSpan.innerText = vip ? '5' : '1';
    
    const percent = (clickCountHour / maxClicks) * 100;
    clickProgress.style.width = Math.min(percent, 100) + '%';
    
    if (clickCountHour >= maxClicks) {
        clickerCoin.classList.add('disabled');
    } else {
        clickerCoin.classList.remove('disabled');
    }
}

function updateClickerUI() {
    updateClickerLimits();
}

clickerCoin.addEventListener('click', () => {
    const maxClicks = 200;
    if (clickCountHour >= maxClicks) {
        showMessage('Лимит кликов на сегодня исчерпан. Подождите.');
        return;
    }
    
    const now = Date.now();
    const period = vip ? 30 * 60 * 1000 : 60 * 60 * 1000;
    if (now - lastClickResetTime > period) {
        clickCountHour = 0;
        lastClickResetTime = now;
    }
    
    const reward = vip ? 5 : 1;
    userData.coins += reward;
    clickCountHour++;
    clickerEarned.innerText = clickCountHour;
    updateUI();
    updateClickerLimits();
    
    clickerCoin.style.transform = 'scale(0.7)';
    setTimeout(() => clickerCoin.style.transform = '', 100);
});

// --- Магазин: покупка VIP ---
buyVipBtn.addEventListener('click', async () => {
    if (vip) {
        showMessage('У вас уже есть VIP статус!');
        return;
    }
    if (userData.coins < 10000) {
        showMessage('Недостаточно монет');
        return;
    }
    
    try {
        const res = await fetch("/api/buy-vip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramId })
        });
        if (!res.ok) throw new Error('Ошибка');
        const data = await res.json();
        userData.coins = data.coins;
        vip = true;
        updateUI();
        showMessage('Поздравляем! Вы приобрели VIP статус!');
    } catch (error) {
        // Локально
        userData.coins -= 10000;
        vip = true;
        updateUI();
        showMessage('Поздравляем! Вы приобрели VIP статус! (локально)');
    }
});

// --- Запуск ---
login();
