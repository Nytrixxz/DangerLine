// app.js
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
} else {
    console.log('Работаем вне Telegram');
}

let userData;
let telegramId = tg?.initDataUnsafe?.user?.id || 'local_' + Math.random().toString(36).substr(2, 9);
let username = tg?.initDataUnsafe?.user?.username || "Игрок";
let ref = new URLSearchParams(window.location.search).get("start");

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
const refListUl = document.getElementById('ref-list');
const copyRefBtn = document.getElementById('copy-ref');

// Экраны и навигация
const screens = document.querySelectorAll('.screen');
const navBtns = document.querySelectorAll('.nav-btn');

// Игровые элементы
const rouletteSpin = document.getElementById('roulette-spin');
const blackjackPlay = document.getElementById('blackjack-play');
const blackjackHit = document.getElementById('blackjack-hit');
const blackjackStand = document.getElementById('blackjack-stand');
const rouletteResult = document.getElementById('roulette-result');
const blackjackResult = document.getElementById('blackjack-result');
const dealerCardsSpan = document.getElementById('dealer-cards');
const playerCardsSpan = document.getElementById('player-cards');

// Кейсы
const caseButtons = document.querySelectorAll('.open-case-btn');

// Кликер
const clickerCoin = document.getElementById('clicker-coin');
const clickerEarned = document.getElementById('clicker-earned');
let clickCount = 0;
let lastClickTime = 0;
const CLICK_DELAY = 100; // минимальный интервал между кликами (мс)

// Вспомогательные функции
function showMessage(msg) {
    if (tg) tg.showAlert(msg); else alert(msg);
}

function formatCoins(coins) {
    return Math.floor(coins); // показываем целые числа
}

function updateUI() {
    balanceSpan.innerText = formatCoins(userData.coins);
    usernameSpan.innerText = username;
    profileNameSpan.innerText = username;
    profileIdSpan.innerText = `ID: ${telegramId || 'unknown'}`;
    profileBalanceSpan.innerText = formatCoins(userData.coins);
    const refLink = `https://t.me/dangerline_bot?start=${telegramId || ''}`;
    refLinkInput.value = refLink;
    refCountSpan.innerText = userData.referrals || 0;
    refEarnedSpan.innerText = (userData.referrals || 0) * 500;
    
    // Демо-список рефералов (в реальности запрос к серверу)
    if (userData.referrals > 0) {
        let html = '';
        for (let i = 0; i < userData.referrals; i++) {
            html += `<li class="ref-item">user${i+1} <span class="ref-bonus">+500</span></li>`;
        }
        refListUl.innerHTML = html || '<li class="ref-item">Пока никого</li>';
    } else {
        refListUl.innerHTML = '<li class="ref-item">Пока никого</li>';
    }
}

// --- Вход в систему ---
async function login() {
    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramId, username, ref })
        });
        if (!res.ok) throw new Error('Network error');
        userData = await res.json();
    } catch (error) {
        console.error('Login failed, using local data');
        userData = { coins: 1000, referrals: 3 }; // для теста покажем 3 рефералов
    } finally {
        updateUI();
        loader.classList.add('hidden');
        main.classList.remove('hidden');
    }
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

// --- Рефералы: копирование ссылки ---
copyRefBtn.addEventListener('click', () => {
    refLinkInput.select();
    navigator.clipboard.writeText(refLinkInput.value).then(() => {
        showMessage('Ссылка скопирована!');
    }).catch(() => {
        showMessage('Не удалось скопировать');
    });
});

// --- Кейсы с анимацией и шансами ---
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
    
    // Анимация открытия
    caseCard.classList.add('opening');
    
    // Списываем монеты
    userData.coins -= prices[type];
    updateUI();
    
    // Имитация задержки открытия
    setTimeout(async () => {
        caseCard.classList.remove('opening');
        
        // Определяем выигрыш с учётом шансов
        let reward = 0;
        const rand = Math.random();
        
        if (type === 'common') {
            // Обычный кейс: шансы и выигрыши
            if (rand < 0.5) reward = Math.floor(Math.random() * 50) + 50;   // 50-100 (50%)
            else if (rand < 0.8) reward = Math.floor(Math.random() * 100) + 150; // 150-250 (30%)
            else reward = Math.floor(Math.random() * 300) + 300; // 300-600 (20%)
        } else if (type === 'rare') {
            // Редкий кейс
            if (rand < 0.4) reward = Math.floor(Math.random() * 200) + 300;   // 300-500 (40%)
            else if (rand < 0.7) reward = Math.floor(Math.random() * 300) + 600; // 600-900 (30%)
            else reward = Math.floor(Math.random() * 500) + 1000; // 1000-1500 (30%)
        } else if (type === 'legendary') {
            // Легендарный кейс
            if (rand < 0.3) reward = Math.floor(Math.random() * 500) + 1000;   // 1000-1500 (30%)
            else if (rand < 0.6) reward = Math.floor(Math.random() * 1000) + 1500; // 1500-2500 (30%)
            else reward = Math.floor(Math.random() * 3000) + 2500; // 2500-5500 (40%)
        }
        
        userData.coins += reward;
        updateUI();
        showMessage(`✨ Вы выиграли ${reward} монет!`);
        
        // Дополнительная вспышка
        caseCard.style.boxShadow = '0 0 30px gold';
        setTimeout(() => caseCard.style.boxShadow = '', 500);
        
    }, 600); // длительность анимации
}

// --- Рулетка ---
let selectedColor = 'red';
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedColor = btn.dataset.color;
    });
});

rouletteSpin.addEventListener('click', () => {
    const bet = 10;
    if (userData.coins < bet) {
        showMessage('Недостаточно монет');
        return;
    }
    userData.coins -= bet;
    updateUI();

    // Анимация вращения
    const wheel = document.getElementById('roulette-wheel');
    wheel.classList.add('spinning');
    rouletteResult.innerText = 'Крутим...';

    setTimeout(() => {
        wheel.classList.remove('spinning');
        
        // Результат с реалистичными шансами
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
        
        // Подсветка выпавшего цвета
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

// --- Блэкджек ---
let playerHand = [];
let dealerHand = [];
let gameActive = false;

function getCardValue(card) {
    return card; // карты храним как числа от 2 до 11
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

function renderBlackjack() {
    playerCardsSpan.innerText = playerHand.join(' ') || '—';
    dealerCardsSpan.innerText = gameActive ? dealerHand[0] + ' ?' : dealerHand.join(' ') || '—';
}

function startBlackjack() {
    const bet = 10;
    if (userData.coins < bet) {
        showMessage('Недостаточно монет');
        return false;
    }
    userData.coins -= bet;
    updateUI();
    
    // Раздача карт (числа)
    const deck = [2,3,4,5,6,7,8,9,10,10,10,10,11]; // 10 - валет/дама/король, 11 - туз
    playerHand = [];
    dealerHand = [];
    for (let i = 0; i < 2; i++) {
        playerHand.push(deck[Math.floor(Math.random() * deck.length)]);
        dealerHand.push(deck[Math.floor(Math.random() * deck.length)]);
    }
    gameActive = true;
    renderBlackjack();
    blackjackResult.innerText = '';
    
    // Проверка на блэкджек (21)
    if (calcHand(playerHand) === 21) {
        endBlackjack('blackjack');
    }
}

function endBlackjack(reason) {
    gameActive = false;
    const playerSum = calcHand(playerHand);
    let dealerSum = calcHand(dealerHand);
    
    if (reason === 'blackjack') {
        userData.coins += 25; // выигрыш 2.5x (имитация)
        blackjackResult.innerText = '🎉 Блэкджек! Вы выиграли 25 монет!';
    } else if (reason === 'bust') {
        blackjackResult.innerText = '😞 Перебор, вы проиграли';
    } else if (reason === 'stand') {
        // Дилер добирает до 17
        const deck = [2,3,4,5,6,7,8,9,10,10,10,10,11];
        while (calcHand(dealerHand) < 17) {
            dealerHand.push(deck[Math.floor(Math.random() * deck.length)]);
        }
        renderBlackjack();
        dealerSum = calcHand(dealerHand);
        
        if (dealerSum > 21 || playerSum > dealerSum) {
            userData.coins += 20; // выигрыш 2x
            blackjackResult.innerText = '🎉 Вы выиграли!';
        } else if (playerSum === dealerSum) {
            userData.coins += 10; // возврат
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

// --- Кликер с защитой от авто-кликера ---
clickerCoin.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastClickTime < CLICK_DELAY) {
        showMessage('Слишком быстро! Замедлитесь.');
        return;
    }
    lastClickTime = now;
    
    userData.coins += 1;
    clickCount++;
    clickerEarned.innerText = clickCount;
    updateUI();
    
    // Микро-анимация
    clickerCoin.style.transform = 'scale(0.7)';
    setTimeout(() => clickerCoin.style.transform = '', 100);
});

// Запуск
login();
