// game.js - Motor principal, loop de jogo e colisão

console.log("Game.js carregando...");

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da UI
const UI = {
    score: document.getElementById('score'),
    coins: document.getElementById('coins'),
    gameOverScreen: document.getElementById('game-over'),
    finalScore: document.getElementById('final-score'),
    finalCoins: document.getElementById('final-coins'),
    shopScreen: document.getElementById('shop'),
    btnRestart: document.getElementById('btn-restart'),
    btnShopGo: document.getElementById('btn-shop-go'),
    btnShop: document.getElementById('btn-shop'),
    btnCloseShop: document.getElementById('btn-close-shop'),
    startMenu: document.getElementById('start-menu'),
    btnStart: document.getElementById('btn-start'),
    btnShopMenu: document.getElementById('btn-shop-menu'),
    highScore: document.getElementById('high-score'),
    btnPause: document.getElementById('btn-pause'),
    pauseScreen: document.getElementById('pause-screen'),
    btnResume: document.getElementById('btn-resume'),
    btnShopPause: document.getElementById('btn-shop-pause')
};

// Configurações do Jogo
let isGameOver = false;
let isGamePaused = false;
let isGameStarted = false;
let frameCount = 0;
let score = 0;
let distance = 0;
let totalDistance = 0;
let gameSpeed = 3;
let gameLoopId = null;
let currentMode = 'road'; // 'road', 'water', 'air'

// Controle de Spawns independentes de Frames
let distanceSinceLastEnemy = 0;
let distanceSinceLastCoin = 0;
let highScore = localStorage.getItem('infinityDrive_highscore') || 0;

// Objeto do Jogador
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 100,
    width: 36,
    height: 60,
    speed: 6,
    dx: 0,
    color: '#ff3333'
};

function updatePlayerCarColor() {
    if (typeof CARS !== 'undefined' && typeof selectedCarId !== 'undefined') {
        const car = CARS.find(c => c.id === selectedCarId);
        if (car) player.color = car.color;
    }
}

// Teclado
const keys = { ArrowLeft: false, ArrowRight: false, a: false, d: false };

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key.toLowerCase() === 'a') keys.a = true;
    if (e.key.toLowerCase() === 'd') keys.d = true;

    if (e.key.toLowerCase() === 'p') {
        if (typeof totalCoins !== 'undefined') {
            totalCoins += 1000;
            if (UI.coins) UI.coins.innerText = totalCoins;
            if (typeof saveProgress === 'function') saveProgress();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key.toLowerCase() === 'a') keys.a = false;
    if (e.key.toLowerCase() === 'd') keys.d = false;
});

// Toque Mobile
canvas.addEventListener('touchstart', (e) => {
    const touchX = e.touches[0].clientX;
    const canvasRect = canvas.getBoundingClientRect();
    const x = touchX - canvasRect.left;
    if (x < canvas.width / 2) keys.ArrowLeft = true;
    else keys.ArrowRight = true;
}, {passive: true});
canvas.addEventListener('touchend', () => {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
}, {passive: true});

// Entidades
let enemies = [];
let coins = [];
let roadLines = [];

function initGame() {
    console.log("Iniciando novo jogo...");
    isGameOver = false;
    isGamePaused = false;
    isGameStarted = true;
    score = 0;
    distance = 0;
    totalDistance = 0;
    gameSpeed = 3;
    frameCount = 0;
    distanceSinceLastEnemy = 0;
    distanceSinceLastCoin = 0;

    player.x = canvas.width / 2 - player.width / 2;
    enemies = [];
    coins = [];
    roadLines = [];

    for (let i = 0; i < canvas.height; i += 60) {
        roadLines.push({ y: i });
    }

    UI.gameOverScreen.classList.add('hidden');
    UI.shopScreen.classList.add('hidden');
    UI.startMenu.classList.add('hidden');
    UI.pauseScreen.classList.add('hidden');
    UI.score.innerText = '0';
    if (typeof totalCoins !== 'undefined') UI.coins.innerText = totalCoins;

    updatePlayerCarColor();

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(gameLoop);
}

function showMainMenu() {
    console.log("Mostrando Menu Inicial...");
    isGameStarted = false;
    UI.startMenu.classList.remove('hidden');
    UI.highScore.innerText = highScore;
    updatePlayerCarColor();
    draw();
}

function spawnEnemy() {
    const width = 36;
    const height = 60;
    const minX = 20;
    const maxX = canvas.width - width - 20;
    const x = Math.random() * (maxX - minX) + minX;
    const speedOffset = Math.random() * 2 + (currentMode === 'air' ? 2 : 1);
    const colors = ['#33ff33', '#3333ff', '#ff33ff', '#33ffff', '#ff9900', '#aaaaaa'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    enemies.push({ x, y: -height, width, height, speedOffset, color });
}

function spawnCoin() {
    const size = 20;
    const minX = 25;
    const maxX = canvas.width - size - 25;
    const x = Math.random() * (maxX - minX) + minX;
    coins.push({ x, y: -size, width: size, height: size });
}

function update() {
    if (!isGameStarted) {
        totalDistance += 2;
        for (let i = 0; i < roadLines.length; i++) {
            roadLines[i].y += 2;
            if (roadLines[i].y >= canvas.height) roadLines[i].y -= canvas.height + 60;
        }
        return;
    }

    if (isGameOver || isGamePaused) return;

    frameCount++;
    distance += gameSpeed;
    totalDistance += gameSpeed;
    distanceSinceLastEnemy += gameSpeed;
    distanceSinceLastCoin += gameSpeed;

    gameSpeed += 0.005;

    if (distance > 100) {
        score += 1;
        distance = 0;
        UI.score.innerText = score;
    }

    if (keys.ArrowLeft || keys.a) player.dx = -player.speed;
    else if (keys.ArrowRight || keys.d) player.dx = player.speed;
    else player.dx = 0;

    player.x += player.dx;
    if (player.x < 15) player.x = 15;
    if (player.x + player.width > canvas.width - 15) player.x = canvas.width - player.width - 15;

    for (let i = 0; i < roadLines.length; i++) {
        roadLines[i].y += gameSpeed;
        if (roadLines[i].y >= canvas.height) roadLines[i].y -= canvas.height + 60;
    }

    if (distanceSinceLastEnemy > 150 && Math.random() < 0.05) {
        spawnEnemy();
        distanceSinceLastEnemy = 0;
    }
    if (distanceSinceLastCoin > 300 && Math.random() < 0.02) {
        spawnCoin();
        distanceSinceLastCoin = 0;
    }

    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        e.y += gameSpeed + e.speedOffset;
        const margin = 4;
        if (player.x + margin < e.x + e.width - margin &&
            player.x + player.width - margin > e.x + margin &&
            player.y + margin < e.y + e.height - margin &&
            player.y + player.height - margin > e.y + margin) {
            triggerGameOver();
        }
    }
    enemies = enemies.filter(e => e.y < canvas.height);

    for (let i = 0; i < coins.length; i++) {
        let c = coins[i];
        c.y += gameSpeed;
        if (player.x < c.x + c.width && player.x + player.width > c.x &&
            player.y < c.y + c.height && player.y + player.height > c.y) {
            if (typeof totalCoins !== 'undefined') {
                totalCoins += 1;
                c.collected = true;
                UI.coins.innerText = totalCoins;
                if (typeof saveProgress === 'function') saveProgress();
            }
        }
    }
    coins = coins.filter(c => c.y < canvas.height && !c.collected);
}

// Desenhos
function drawCar(ctx, x, y, width, height, color) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, width, height, 5);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 2, y + 10, 4, 12);
    ctx.fillRect(x + width - 2, y + 10, 4, 12);
    ctx.fillRect(x - 2, y + height - 22, 4, 12);
    ctx.fillRect(x + width - 2, y + height - 22, 4, 12);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.fill();
    ctx.fillStyle = '#223344';
    ctx.fillRect(x + 5, y + 15, width - 10, 12);
    ctx.fillStyle = '#ffffee'; 
    ctx.fillRect(x + 3, y + 2, 8, 5); ctx.fillRect(x + width - 11, y + 2, 8, 5);
}

function drawBoat(ctx, x, y, width, height, color) {
    ctx.fillStyle = 'rgba(0, 40, 80, 0.4)';
    ctx.beginPath(); ctx.ellipse(x + width/2 + 4, y + height/2 + 4, width/2, height/2 + 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + width/2, y);
    ctx.bezierCurveTo(x + width, y + height*0.3, x + width, y + height, x + width/2, y + height);
    ctx.bezierCurveTo(x, y + height, x, y + height*0.3, x + width/2, y);
    ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(x + width/2 - 5, y + height - 5, 10, 8);
}

function drawPlane(ctx, x, y, width, height, color) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath(); ctx.ellipse(x + width/2 + 10, y + height/2 + 10, width, height/2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(x - width*0.8, y + height*0.3, width*2.6, height*0.2, 5); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + width/2, y + height/2, width/2, height/2, 0, 0, Math.PI * 2); ctx.fill();
}

function drawVehicle(ctx, x, y, width, height, color) {
    if (currentMode === 'road') drawCar(ctx, x, y, width, height, color);
    else if (currentMode === 'water') drawBoat(ctx, x, y, width, height, color);
    else if (currentMode === 'air') drawPlane(ctx, x, y, width, height, color);
}

function drawCoin(ctx, x, y, size) {
    const rx = x + size/2; const ry = y + size/2; const r = size/2;
    ctx.beginPath(); ctx.arc(rx, ry + 4, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fill();
    ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI * 2); ctx.fillStyle = '#ffd700'; ctx.fill();
    ctx.fillStyle = '#b8860b'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', rx, ry);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (currentMode === 'road') {
        ctx.fillStyle = '#383a40'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < roadLines.length; i++) {
            ctx.fillRect(canvas.width / 3 - 2, roadLines[i].y, 4, 30);
            ctx.fillRect((canvas.width / 3) * 2 - 2, roadLines[i].y, 4, 30);
        }
    } else if (currentMode === 'water') {
        ctx.fillStyle = '#0066cc'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (currentMode === 'air') {
        ctx.fillStyle = '#87ceeb'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (let c of coins) drawCoin(ctx, c.x, c.y, c.width);
    for (let e of enemies) drawVehicle(ctx, e.x, e.y, e.width, e.height, e.color);
    drawVehicle(ctx, player.x, player.y, player.width, player.height, player.color);
}

function triggerGameOver() {
    isGameOver = true;
    if (score > highScore) { highScore = score; localStorage.setItem('infinityDrive_highscore', highScore); }
    UI.finalScore.innerText = score;
    if (typeof totalCoins !== 'undefined') UI.finalCoins.innerText = totalCoins;
    UI.gameOverScreen.classList.remove('hidden');
}

function gameLoop() {
    if (isGameStarted) {
        if (!isGamePaused && !isGameOver) update();
        draw();
        if (!isGameOver) gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// Eventos de Botões Robustos
function togglePause() {
    isGamePaused = !isGamePaused;
    if (isGamePaused) UI.pauseScreen.classList.remove('hidden');
    else UI.pauseScreen.classList.add('hidden');
}

window.addEventListener('load', () => {
    console.log("Página carregada, vinculando botões...");

    if (UI.btnStart) UI.btnStart.onclick = () => initGame();
    if (UI.btnRestart) UI.btnRestart.onclick = () => initGame();
    
    if (UI.btnPause) UI.btnPause.onclick = () => { if(isGameStarted && !isGameOver) togglePause(); };
    if (UI.btnResume) UI.btnResume.onclick = () => togglePause();

    if (UI.btnShop) UI.btnShop.onclick = () => { if(!isGameOver) { isGamePaused = true; UI.shopScreen.classList.remove('hidden'); if(typeof updateShopUI === 'function') updateShopUI(); } };
    if (UI.btnShopMenu) UI.btnShopMenu.onclick = () => { UI.startMenu.classList.add('hidden'); UI.shopScreen.classList.remove('hidden'); if(typeof updateShopUI === 'function') updateShopUI(); };
    if (UI.btnShopGo) UI.btnShopGo.onclick = () => { UI.gameOverScreen.classList.add('hidden'); UI.shopScreen.classList.remove('hidden'); if(typeof updateShopUI === 'function') updateShopUI(); };
    if (UI.btnShopPause) UI.btnShopPause.onclick = () => { UI.pauseScreen.classList.add('hidden'); UI.shopScreen.classList.remove('hidden'); if(typeof updateShopUI === 'function') updateShopUI(); };

    if (UI.btnCloseShop) UI.btnCloseShop.onclick = () => {
        UI.shopScreen.classList.add('hidden');
        updatePlayerCarColor();
        if (!isGameStarted) UI.startMenu.classList.remove('hidden');
        else if (isGameOver) UI.gameOverScreen.classList.remove('hidden');
        else if (isGamePaused) UI.pauseScreen.classList.remove('hidden');
    };

    // Botões de Modo
    ['road', 'water', 'air'].forEach(mode => {
        const btn = document.getElementById('mode-' + mode);
        if (btn) btn.onclick = () => {
            console.log("Modo:", mode);
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = mode;
            draw();
        };
    });

    updatePlayerCarColor();
    showMainMenu();

    function menuAnimationLoop() {
        if (!isGameStarted) { draw(); gameLoopId = requestAnimationFrame(menuAnimationLoop); }
    }
    menuAnimationLoop();
});
