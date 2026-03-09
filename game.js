// game.js - Motor principal, loop de jogo e colisão

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
    color: '#ff3333' // Cor base, vai ser sobrescrita pelo Shop
};

// Sincroniza a cor do jogador com a loja
function updatePlayerCarColor() {
    if (typeof CARS !== 'undefined') {
        const car = CARS.find(c => c.id === selectedCarId);
        if (car) player.color = car.color;
    }
}

// Inputs (Teclado)
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    a: false,
    d: false
};

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
    if (e.key === 'a' || e.key === 'A') keys.a = true;
    if (e.key === 'd' || e.key === 'D') keys.d = true;

    if (e.key === 'p' || e.key === 'P') {
        if (typeof totalCoins !== 'undefined') {
            totalCoins += 1000;
            if (UI.coins) UI.coins.innerText = totalCoins;
            if (typeof saveProgress === 'function') saveProgress();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key === 'a' || e.key === 'A') keys.a = false;
    if (e.key === 'd' || e.key === 'D') keys.d = false;
});

// Inputs (Toque)
canvas.addEventListener('touchstart', (e) => {
    const touchX = e.touches[0].clientX;
    const canvasRect = canvas.getBoundingClientRect();
    const x = touchX - canvasRect.left;
    if (x < canvas.width / 2) {
        keys.ArrowLeft = true;
    } else {
        keys.ArrowRight = true;
    }
});
canvas.addEventListener('touchend', () => {
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
});

// Seletor de Modo
function setupModeButtons() {
    const buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach(btn => {
        btn.onclick = () => {
            console.log("Mudando para o modo:", btn.dataset.mode);
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            draw(); // Atualiza fundo no menu
        };
    });
}
setupModeButtons();

// Listas de entidades
let enemies = [];
let coins = [];
let roadLines = [];

function initGame() {
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
    UI.coins.innerText = totalCoins;

    updatePlayerCarColor();

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(gameLoop);
}

function showMainMenu() {
    isGameStarted = false;
    if (UI.startMenu) UI.startMenu.classList.remove('hidden');
    if (UI.highScore) UI.highScore.innerText = highScore;
    updatePlayerCarColor();
    draw();
}

function spawnEnemy() {
    const width = 36;
    const height = 60;
    const minX = 20;
    const maxX = canvas.width - width - 20;
    const x = Math.random() * (maxX - minX) + minX;
    const speedOffset = Math.random() * 2 + 1;
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
            if (roadLines[i].y >= canvas.height) {
                roadLines[i].y -= canvas.height + 60;
            }
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

    if (keys.ArrowLeft || keys.a) {
        player.dx = -player.speed;
    } else if (keys.ArrowRight || keys.d) {
        player.dx = player.speed;
    } else {
        player.dx = 0;
    }

    player.x += player.dx;

    if (player.x < 15) player.x = 15;
    if (player.x + player.width > canvas.width - 15) {
        player.x = canvas.width - player.width - 15;
    }

    for (let i = 0; i < roadLines.length; i++) {
        roadLines[i].y += gameSpeed;
        if (roadLines[i].y >= canvas.height) {
            roadLines[i].y -= canvas.height + 60;
        }
    }

    let minDistanceForEnemy = 150;
    if (distanceSinceLastEnemy > minDistanceForEnemy && Math.random() < 0.05) {
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
        if (player.x < c.x + c.width &&
            player.x + player.width > c.x &&
            player.y < c.y + c.height &&
            player.y + player.height > c.y) {
            totalCoins += 1;
            c.collected = true;
            UI.coins.innerText = totalCoins;
            saveProgress();
        }
    }

    coins = coins.filter(c => c.y < canvas.height && !c.collected);
}

// Funções de Desenho
function drawVehicle(ctx, x, y, width, height, color, type) {
    if (type === 'road') {
        drawCar(ctx, x, y, width, height, color);
    } else if (type === 'water') {
        drawBoat(ctx, x, y, width, height, color);
    } else if (type === 'air') {
        drawPlane(ctx, x, y, width, height, color);
    }
}

function drawCar(ctx, x, y, width, height, color) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, width, height, 5);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 2, y + 10, 4, 12);
    ctx.fillRect(x + width - 2, y + 10, 4, 12);
    ctx.fillRect(x - 2, y + height - 22, 4, 12);
    ctx.fillRect(x + width - 2, y + height - 22, 4, 12);

    const grad = ctx.createLinearGradient(x, y, x + width, y);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, '#ffffff33');
    grad.addColorStop(1, color);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.filter = 'brightness(85%)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 14, width - 8, height - 28, 4);
    ctx.fill();
    ctx.filter = 'none';

    ctx.fillStyle = '#223344';
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 15, width - 10, 12, 3);
    ctx.roundRect(x + 5, y + height - 25, width - 10, 10, 3);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.rect(x + 5, y + 15, width - 10, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffee'; 
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 2, 8, 5, 2);
    ctx.roundRect(x + width - 11, y + 2, 8, 5, 2);
    ctx.fill();

    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + height - 6, 10, 4, 2);
    ctx.roundRect(x + width - 13, y + height - 6, 10, 4, 2);
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.fillRect(x + width/2 - 4, y + height - 4, 8, 3);
}

function drawBoat(ctx, x, y, width, height, color) {
    // Sombra na água
    ctx.fillStyle = 'rgba(0, 40, 80, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x + width/2 + 4, y + height/2 + 4, width/2, height/2 + 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Casco do Barco (Formato de gota/ponta na frente)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + width/2, y); // Ponta frente
    ctx.bezierCurveTo(x + width, y + height*0.3, x + width, y + height, x + width/2, y + height);
    ctx.bezierCurveTo(x, y + height, x, y + height*0.3, x + width/2, y);
    ctx.fill();

    // Interior / Deck
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(x + width/2, y + height*0.6, width/3, height/4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Motor de popa
    ctx.fillStyle = '#111';
    ctx.fillRect(x + width/2 - 5, y + height - 5, 10, 8);
}

function drawPlane(ctx, x, y, width, height, color) {
    // Sombra (Mais distante)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x + width/2 + 10, y + height/2 + 10, width, height/2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Asas
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - width*0.8, y + height*0.3, width*2.6, height*0.2, 5);
    ctx.fill();

    // Fuselagem
    ctx.fillStyle = color;
    ctx.filter = 'brightness(110%)';
    ctx.beginPath();
    ctx.ellipse(x + width/2, y + height/2, width/2, height/2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = 'none';

    // Hélices (Girando)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + width/2, y, width*0.8, 0, Math.PI * 2);
    ctx.stroke();
}

function drawCoin(ctx, x, y, size) {
    const rx = x + size / 2;
    const ry = y + size / 2;
    const r = size / 2;

    ctx.beginPath();
    ctx.arc(rx, ry + 4, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    const grad = ctx.createRadialGradient(rx - size/4, ry - size/4, size/10, rx, ry, r);
    grad.addColorStop(0, '#ffffaa');
    grad.addColorStop(0.6, '#ffd700');
    grad.addColorStop(1, '#b8860b');

    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fff172';
    ctx.beginPath();
    ctx.arc(rx, ry, r - 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#946c00';
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', rx, ry + 1.5);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText('$', rx, ry - 0.5);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentMode === 'road') {
        // Asfalto
        ctx.fillStyle = '#383a40';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        for(let i=0; i<15; i++) {
            let rsx = (Math.sin(i * 123) * 1000) % canvas.width;
            let rsy = (i * 100 + totalDistance * 1.2) % canvas.height;
            ctx.fillRect(Math.abs(rsx), rsy, 3, 15);
        }

        const zebraSpeedBase = totalDistance % 60;
        for (let i = -60; i < canvas.height; i += 60) {
            ctx.fillStyle = (i + Math.floor(totalDistance / 60) * 60) % 120 < 60 ? '#cc0000' : '#ffffff';
            ctx.fillRect(18, i + zebraSpeedBase, 4, 60);
            ctx.fillRect(canvas.width - 22, i + zebraSpeedBase, 4, 60);
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (let i = 0; i < roadLines.length; i++) {
            ctx.fillRect(canvas.width / 3 - 2, roadLines[i].y, 4, 30);
            ctx.fillRect((canvas.width / 3) * 2 - 2, roadLines[i].y, 4, 30);
        }
    } else if (currentMode === 'water') {
        // Água
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Ondas / Bolhas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for(let i=0; i<20; i++) {
            let rsx = (Math.sin(i * 123) * 1000) % canvas.width;
            let rsy = (i * 80 + totalDistance * 1.5) % canvas.height;
            ctx.beginPath();
            ctx.arc(Math.abs(rsx), rsy, 2 + Math.random()*3, 0, Math.PI*2);
            ctx.fill();
        }

        // Bordas da Margem (Areia/Terra)
        ctx.fillStyle = '#d2b48c';
        ctx.fillRect(0, 0, 15, canvas.height);
        ctx.fillRect(canvas.width - 15, 0, 15, canvas.height);
    } else if (currentMode === 'air') {
        // Céu
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, '#87ceeb');
        skyGrad.addColorStop(1, '#4682b4');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Nuvens
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for(let i=0; i<8; i++) {
            let rsx = (Math.sin(i * 456) * 1000) % canvas.width;
            let rsy = (i * 150 + totalDistance * 0.8) % canvas.height;
            ctx.beginPath();
            ctx.arc(Math.abs(rsx), rsy, 30, 0, Math.PI*2);
            ctx.arc(Math.abs(rsx) + 20, rsy + 10, 25, 0, Math.PI*2);
            ctx.arc(Math.abs(rsx) - 20, rsy + 10, 25, 0, Math.PI*2);
            ctx.fill();
        }
    }

    for (let c of coins) {
        let hoverY = Math.sin((frameCount + c.x) * 0.1) * 3;
        drawCoin(ctx, c.x, c.y + hoverY, c.width);
    }

    for (let e of enemies) {
        drawVehicle(ctx, e.x, e.y, e.width, e.height, e.color, currentMode);
    }

    if (!isGameOver && !isGamePaused && gameSpeed >= 4 && isGameStarted) {
        ctx.fillStyle = frameCount % 4 < 2 ? '#ffb700' : '#ff4400';
        ctx.beginPath();
        let fx = player.x + player.width/2;
        let fy = player.y + player.height;
        ctx.arc(fx, fy + (4 + Math.random()*6), 2 + Math.random()*2.5, 0, Math.PI*2);
        ctx.fill();
    }
    
    drawVehicle(ctx, player.x, player.y, player.width, player.height, player.color, currentMode);
}

function triggerGameOver() {
    isGameOver = true;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('infinityDrive_highscore', highScore);
    }
    UI.finalScore.innerText = score;
    UI.finalCoins.innerText = totalCoins;
    UI.gameOverScreen.classList.remove('hidden');
}

function gameLoop() {
    if (isGameStarted) {
        if (!isGamePaused && !isGameOver) {
            update();
        }
        draw();
        if (!isGameOver) {
            gameLoopId = requestAnimationFrame(gameLoop);
        }
    }
}

if (UI.btnRestart) UI.btnRestart.onclick = () => {
    console.log("Reiniciando...");
    initGame();
};

if (UI.btnStart) UI.btnStart.onclick = () => {
    console.log("Iniciando...");
    initGame();
};

if (UI.btnShopMenu) UI.btnShopMenu.onclick = () => {
    UI.startMenu.classList.add('hidden');
    UI.shopScreen.classList.remove('hidden');
    updateShopUI();
};

if (UI.btnShopGo) UI.btnShopGo.onclick = () => {
    UI.gameOverScreen.classList.add('hidden');
    UI.shopScreen.classList.remove('hidden');
    updateShopUI();
};

if (UI.btnPause) UI.btnPause.onclick = (e) => {
    e.stopPropagation();
    if (isGameStarted && !isGameOver) {
        togglePause();
    }
};

if (UI.btnResume) UI.btnResume.onclick = (e) => {
    e.stopPropagation();
    togglePause();
};

if (UI.btnShopPause) UI.btnShopPause.onclick = (e) => {
    e.stopPropagation();
    UI.pauseScreen.classList.add('hidden');
    UI.shopScreen.classList.remove('hidden');
    updateShopUI();
};

function togglePause() {
    isGamePaused = !isGamePaused;
    if (isGamePaused) {
        UI.pauseScreen.classList.remove('hidden');
    } else {
        UI.pauseScreen.classList.add('hidden');
    }
}

if (UI.btnShop) UI.btnShop.onclick = (e) => {
    e.stopPropagation();
    if (!isGameOver) {
        isGamePaused = true;
        UI.pauseScreen.classList.add('hidden'); // Esconde pausa se estiver aberta
        UI.shopScreen.classList.remove('hidden');
        updateShopUI();
    }
};

if (UI.btnCloseShop) UI.btnCloseShop.onclick = (e) => {
    e.stopPropagation();
    UI.shopScreen.classList.add('hidden');
    updatePlayerCarColor();
    if (!isGameStarted) {
        UI.startMenu.classList.remove('hidden');
    } else if (isGameOver) {
        UI.gameOverScreen.classList.remove('hidden');
    } else if (isGamePaused) {
        // Se estava pausado, volta para a tela de pausa
        UI.pauseScreen.classList.remove('hidden');
    }
};

updatePlayerCarColor();
showMainMenu();

function menuAnimationLoop() {
    if (!isGameStarted) {
        update();
        draw();
        gameLoopId = requestAnimationFrame(menuAnimationLoop);
    }
}
if (gameLoopId) cancelAnimationFrame(gameLoopId);
menuAnimationLoop();
