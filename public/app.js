// app.js (полностью переработан под ваш сервер)
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
const refLinkInput = document.getElementById('ref-link');
const refCountSpan = document.getElementById('ref-count');
const refEarnedSpan = document.getElementById('ref-earned');
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

// Экраны и навигация
const screens = document.querySelectorAll('.screen');
const navBtns = document.querySelectorAll('.nav-btn');

// --- Состояние приложения ---
let selectedColor = 'red';
let playerHand = [], dealerHand = [], gameActive = false;
let clickCount = 0; // для отображения заработанного в кликере

// --- Вспомогательные функции ---
function showMessage(msg) {
    if (tg) tg.showAlert(msg); else alert(msg);
}

function formatCoins(coins) {
    // Для кликера нужны десятые, поэтому показываем с одним знаком
    return coins.toFixed(1);
}

function updateUI() {
    if (!userData) return;
    balanceSpan.innerText = formatCoins(userData.coins);
    usernameSpan.innerText = username;
    profileNameSpan.innerText = username;
    profileIdSpan.innerText = `ID: ${telegramId}`;
    profileBalanceSpan.innerText = formatCoins(userData.coins);
    
    // Реферальная ссылка
    const refLink = `https://t.me/dangerline_bot?start=${telegramId}`;
    refLinkInput.value = refLink;
    
    // Количество рефералов
    refCountSpan.innerText = userData.referrals || 0;
    refEarnedSpan.innerText = (userData.referrals || 0) * 500;
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
    } catch (error) {
        console.error('Login failed, using local data', error);
        // Локальные данные для тестирования
        userData = { coins: 1000, referrals: 2 };
    } finally {
        updateUI();
        loader.classList.add('hidden');
        main.classList.remove('hidden');
        loadLeaderboard(); // загружаем топ
    }
}

// --- Рефералы: копирование ссылки ---
copyRefBtn.addEventListener('click', () => {
    refLinkInput.select();
    navigator.clipboard.writeText(refLinkInput.value).then(() => {
        showMessage('Ссылка скопирована!');
    }).catch(() => {
        showMessage('Не удалось скопировать');
    });
});

// --- Лидеры (из сервера) ---
async function loadLeaderboard() {
    try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error('Ошибка загрузки топа');
        const leaders = await res.json();
        renderLeaders(leaders);
    } catch (error) {
        console.error('Leaderboard error', error);
        // Заглушка
        renderLeaders([]);
    }
}

function renderLeaders(leaders) {
    if (leaders.length === 0) {
        leadersContainer.innerHTML = '<p class="no-data">Пока нет данных</p>';
        return;
    }
    let html = '';
    leaders.forEach((leader, index) => {
        html += `
            <div class="leader-item">
                <div class="leader-rank">#${index+1}</div>
                <div class="leader-avatar"></div>
                <div class="leader-info">
                    <div class="leader-name">${leader.username || 'Без имени'}</div>
                    <div class="leader-score">${Math.floor(leader.coins)} монет</div>
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

// --- Кейсы (работают с сервером) ---
caseButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const caseCard = e.target.closest('.case-card');
        const type = caseCard.dataset.type;
        openCase(type, caseCard);
    });
});

async function openCase(type, caseCard) {
    if (!userData) return;
    
    caseCard.classList.add('opening');
    
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
        console.error('Case error', error);
        showMessage('Ошибка соединения');
    } finally {
        caseCard.classList.remove('opening');
    }
}

// --- Рулетка (только красное/чёрное) ---
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedColor = btn.dataset.color;
    });
});

rouletteSpin.addEventListener('click', async () => {
    let bet = parseFloat(rouletteBet.value);
    if (isNaN(bet) || bet < 10) bet = 10;
    if (!userData || userData.coins < bet) {
        showMessage('Недостаточно монет');
        return;
    }

    const wheel = document.getElementById('roulette-wheel');
    wheel.classList.add('spinning');
    rouletteResult.innerText = 'Крутим...';

    try {
        const res = await fetch("/api/roulette", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                telegramId,
                bet,
                type: selectedColor, // "red" или "black"
                value: null
            })
        });
        const data = await res.json();
        if (data.error) {
            showMessage(data.error);
            wheel.classList.remove('spinning');
            rouletteResult.innerText = '';
            return;
        }
        
        userData.coins = data.coins;
        updateUI();
        
        // Определяем цвет выпавшего числа
        const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
        let resultColor = 'black';
        if (data.number === 0) resultColor = 'green';
        else if (reds.includes(data.number)) resultColor = 'red';
        
        if (data.win > 0) {
            rouletteResult.innerText = `🎉 Выигрыш: ${data.win} монет! Выпало ${data.number} (${resultColor})`;
        } else {
            rouletteResult.innerText = `😞 Проигрыш. Выпало ${data.number} (${resultColor})`;
        }
        
        // Подсветка
        const segments = document.querySelectorAll('.wheel-segment');
        segments.forEach(seg => {
            if (seg.classList.contains(resultColor)) {
                seg.style.transform = 'scale(1.3)';
                setTimeout(() => seg.style.transform = '', 500);
            }
        });
    } catch (error) {
        console.error('Roulette error', error);
        showMessage('Ошибка соединения');
    } finally {
        wheel.classList.remove('spinning');
    }
});

// --- Блэкджек (локальный, без сервера) ---
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

// --- Кликер (с сервером, +0.1) ---
clickerCoin.addEventListener('click', async () => {
    try {
        const res = await fetch("/api/click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramId })
        });
        const data = await res.json();
        if (data.error) {
            if (data.error === "Too fast") {
                showMessage('Слишком быстро! Подождите секунду.');
            } else {
                showMessage(data.error);
            }
            return;
        }
        userData.coins = data.coins;
        clickCount++;
        clickerEarned.innerText = clickCount;
        updateUI();
        
        // Анимация
        clickerCoin.style.transform = 'scale(0.7)';
        setTimeout(() => clickerCoin.style.transform = '', 100);
    } catch (error) {
        console.error('Click error', error);
        showMessage('Ошибка соединения');
    }
});

// --- Запуск ---
login();
