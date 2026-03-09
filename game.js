// game.js - Motor principal, loop de jogo e colisão

console.log("Game.js Premium Edition Carregando...");

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
    btnCloseShop: document.getElementById('btnCloseShop'),
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
let currentMode = 'road';

// Partículas
let particles = [];

// Controle de Spawns
let distanceSinceLastEnemy = 0;
let distanceSinceLastCoin = 0;
let highScore = localStorage.getItem('infinityDrive_highscore') || 0;

// Jogador
const player = {
    x: canvas.width / 2 - 18,
    y: canvas.height - 120,
    width: 36,
    height: 60,
    speed: 7,
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
        totalCoins += 5000;
        if (UI.coins) UI.coins.innerText = totalCoins;
        if (typeof saveProgress === 'function') saveProgress();
    }
});
document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key.toLowerCase() === 'a') keys.a = false;
    if (e.key.toLowerCase() === 'd') keys.d = false;
});

// Toque
canvas.addEventListener('touchstart', (e) => {
    const tx = e.touches[0].clientX;
    const rect = canvas.getBoundingClientRect();
    const x = tx - rect.left;
    if (x < canvas.width / 2) keys.ArrowLeft = true;
    else keys.ArrowRight = true;
}, {passive: true});
canvas.addEventListener('touchend', () => {
    keys.ArrowLeft = false; keys.ArrowRight = false;
}, {passive: true});

// Entidades
let enemies = [];
let coins = [];
let roadLines = [];

function initGame() {
    isGameOver = false; isGamePaused = false; isGameStarted = true;
    score = 0; distance = 0; totalDistance = 0; gameSpeed = 3.5;
    frameCount = 0; distanceSinceLastEnemy = 0; distanceSinceLastCoin = 0;
    particles = [];
    player.x = canvas.width / 2 - player.width / 2;
    enemies = []; coins = []; roadLines = [];
    for (let i = 0; i < canvas.height + 60; i += 80) roadLines.push({ y: i });

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
    isGameStarted = false;
    UI.startMenu.classList.remove('hidden');
    UI.highScore.innerText = highScore;
    updatePlayerCarColor();
    draw();
}

// Particle System
function createParticle(x, y, color, speedX, speedY, size, life) {
    particles.push({ x, y, color, sx: speedX, sy: speedY, size, life, initialLife: life });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.sx;
        p.y += p.sy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life / p.initialLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

function spawnEnemy() {
    const w = 36, h = 60;
    const x = Math.random() * (canvas.width - w - 40) + 20;
    const speedOffset = Math.random() * 2 + (currentMode === 'air' ? 3 : 1.5);
    const colors = ['#00ffea', '#ff00ff', '#f3ff00', '#ff5e00', '#ffffff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    enemies.push({ x, y: -h, width: w, height: h, speedOffset, color });
}

function spawnCoin() {
    const x = Math.random() * (canvas.width - 60) + 30;
    coins.push({ x, y: -25, width: 22, height: 22 });
}

function update() {
    if (!isGameStarted) {
        totalDistance += 2;
        roadLines.forEach(l => {
            l.y += 2;
            if (l.y >= canvas.height) l.y -= canvas.height + 80;
        });
        return;
    }

    if (isGameOver || isGamePaused) return;

    frameCount++;
    distance += gameSpeed;
    totalDistance += gameSpeed;
    distanceSinceLastEnemy += gameSpeed;
    distanceSinceLastCoin += gameSpeed;

    gameSpeed += 0.004;

    if (distance > 100) {
        score += 1; distance = 0;
        UI.score.innerText = score;
        if (score % 10 === 0) UI.score.classList.add('score-popup');
        else UI.score.classList.remove('score-popup');
    }

    if (keys.ArrowLeft || keys.a) player.dx = -player.speed;
    else if (keys.ArrowRight || keys.d) player.dx = player.speed;
    else player.dx *= 0.8;

    player.x += player.dx;
    if (player.x < 15) player.x = 15;
    if (player.x + player.width > canvas.width - 15) player.x = canvas.width - player.width - 15;

    roadLines.forEach(l => {
        l.y += gameSpeed;
        if (l.y >= canvas.height) l.y -= canvas.height + 80;
    });

    if (distanceSinceLastEnemy > 160 && Math.random() < 0.06) {
        spawnEnemy(); distanceSinceLastEnemy = 0;
    }
    if (distanceSinceLastCoin > 350 && Math.random() < 0.03) {
        spawnCoin(); distanceSinceLastCoin = 0;
    }

    // Effect logic (Smoke, Bubbles, Air)
    if (frameCount % 2 === 0) {
        let pColor = currentMode === 'road' ? 'rgba(200,200,200,0.3)' : (currentMode === 'water' ? '#fff' : 'rgba(255,255,255,0.4)');
        createParticle(player.x + player.width / 2, player.y + player.height, pColor, (Math.random() - 0.5) * 2, 2 + Math.random() * 2, currentMode === 'water' ? 3 : 5, 20);
    }
    updateParticles();

    enemies.forEach(e => {
        e.y += gameSpeed + e.speedOffset;
        if (player.x < e.x + e.width - 5 && player.x + player.width > e.x + 5 &&
            player.y < e.y + e.height - 5 && player.y + player.height > e.y + 5) {
            triggerGameOver();
        }
    });
    enemies = enemies.filter(e => e.y < canvas.height);

    coins.forEach(c => {
        c.y += gameSpeed;
        if (player.x < c.x + c.width && player.x + player.width > c.x &&
            player.y < c.y + c.height && player.y + player.height > c.y) {
            if (typeof totalCoins !== 'undefined') {
                totalCoins += 1; c.collected = true;
                UI.coins.innerText = totalCoins;
                createParticle(c.x, c.y, '#ffd700', (Math.random()-0.5)*10, (Math.random()-0.5)*10, 4, 15);
                if (typeof saveProgress === 'function') saveProgress();
            }
        }
    });
    coins = coins.filter(c => c.y < canvas.height && !c.collected);
}

// PREMIUM DRAWING
function drawVehicle(ctx, x, y, w, h, color, type) {
    ctx.save();
    
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 10;

    if (type === 'road') {
        // Car Body
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
        // Highlights
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x + 5, y + 10, w - 10, 5);
        // Windows
        ctx.fillStyle = '#1a2a3a';
        ctx.beginPath(); ctx.roundRect(x + 4, y + 15, w - 8, 15, 4); ctx.fill();
        // Headlights glow
        ctx.shadowColor = '#ffffaa'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffee';
        ctx.fillRect(x + 4, y + 2, 8, 4); ctx.fillRect(x + w - 12, y + 2, 8, 4);
    } else if (type === 'water') {
        // Boat Hull (Premium Sharp Shape)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y); // Pointy bow
        ctx.lineTo(x + w, y + h * 0.3);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + h * 0.3);
        ctx.closePath();
        ctx.fill();

        // Deck Detail
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.roundRect(x + 5, y + 15, w - 10, h - 25, 5); ctx.fill();

        // Cabin / Glass
        ctx.fillStyle = '#1a3a4a';
        ctx.beginPath(); ctx.roundRect(x + 8, y + 25, w - 16, 20, 3); ctx.fill();

        // Engine / Wake point
        ctx.fillStyle = '#333';
        ctx.fillRect(x + w / 2 - 6, y + h - 5, 12, 10);
    } else if (type === 'air') {
        // Wings (Detailed)
        ctx.fillStyle = color;
        ctx.beginPath(); 
        ctx.roundRect(x - w * 1.2, y + h * 0.35, w * 3.4, h * 0.18, 10); 
        ctx.fill();
        
        // Wing Details (Flaps/Lines)
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - w * 1.2, y + h * 0.35, w * 3.4, h * 0.18);

        // Fuselage (Body)
        const fuselageGrad = ctx.createLinearGradient(x, y, x + w, y);
        fuselageGrad.addColorStop(0, color);
        fuselageGrad.addColorStop(0.5, '#fff');
        fuselageGrad.addColorStop(1, color);
        ctx.fillStyle = fuselageGrad;
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 1.8, h / 2, 0, 0, Math.PI * 2); ctx.fill();

        // Tail
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y + h);
        ctx.lineTo(x + w + 10, y + h + 15);
        ctx.lineTo(x - 10, y + h + 15);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = 'rgba(0, 198, 255, 0.4)';
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.25, w * 0.3, h * 0.15, 0, 0, Math.PI * 2); ctx.fill();

        // Propeller Blur (Animated-style)
        ctx.save();
        ctx.translate(x + w / 2, y);
        ctx.rotate(frameCount * 0.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(w, 0); ctx.stroke();
        ctx.restore();
    }
    
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentMode === 'road') {
        const grd = ctx.createLinearGradient(0, 0, canvas.width, 0);
        grd.addColorStop(0, '#1a1a1a'); grd.addColorStop(0.5, '#2a2a2a'); grd.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        roadLines.forEach(l => {
            ctx.fillRect(canvas.width / 3 - 2, l.y, 4, 40);
            ctx.fillRect((canvas.width / 3) * 2 - 2, l.y, 4, 40);
        });
        // Side barriers
        ctx.fillStyle = '#ff4b2b';
        ctx.fillRect(0, 0, 10, canvas.height);
        ctx.fillRect(canvas.width - 10, 0, 10, canvas.height);
    } else if (currentMode === 'water') {
        // Deep Water Gradient
        const waterGrd = ctx.createLinearGradient(0, 0, 0, canvas.height);
        waterGrd.addColorStop(0, '#001a33');
        waterGrd.addColorStop(0.5, '#003366');
        waterGrd.addColorStop(1, '#001a33');
        ctx.fillStyle = waterGrd; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Moving Waves / Sparkles
        for(let i=0; i<30; i++) {
            let wx = (Math.sin(i * 432) * 1000) % canvas.width;
            let wy = (i * 50 + totalDistance * 1.5) % (canvas.height + 50);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(Math.abs(wx), wy, 40, 2);
        }

        // Shorelines (Sand/Grass)
        ctx.fillStyle = '#d2b48c'; // Sand
        ctx.fillRect(0, 0, 15, canvas.height);
        ctx.fillRect(canvas.width - 15, 0, 15, canvas.height);
        
        // Shore Grass bits
        ctx.fillStyle = '#2d5a27';
        for(let i=0; i<canvas.height; i+=40) {
            let sy = (i + totalDistance)%canvas.height;
            ctx.fillRect(0, sy, 5, 20);
            ctx.fillRect(canvas.width-5, sy, 5, 20);
        }
    } else if (currentMode === 'air') {
        // Atmospheric Sky Gradient
        const skyGrd = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrd.addColorStop(0, '#004e92');
        skyGrd.addColorStop(0.7, '#00b4db');
        skyGrd.addColorStop(1, '#87ceeb');
        ctx.fillStyle = skyGrd; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Distant Lands (Moving slowly below clouds)
        ctx.fillStyle = 'rgba(34, 139, 34, 0.1)';
        for(let i=0; i<3; i++) {
            let ly = (i * 300 + totalDistance * 0.2) % (canvas.height + 200);
            ctx.beginPath(); ctx.ellipse(Math.random()*canvas.width, ly, 100, 50, 0, 0, Math.PI*2); ctx.fill();
        }

        // Clouds (Multi-layered & Soft)
        ctx.filter = 'blur(4px)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for(let i=0; i<8; i++) {
            let cx = (Math.sin(i * 123) * 1000) % canvas.width;
            let cy = (i * 120 + totalDistance * 0.8) % (canvas.height + 100) - 50;
            ctx.beginPath();
            ctx.arc(Math.abs(cx), cy, 35, 0, Math.PI*2);
            ctx.arc(Math.abs(cx) + 25, cy + 10, 25, 0, Math.PI*2);
            ctx.arc(Math.abs(cx) - 25, cy + 10, 25, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.filter = 'none';
    }

    drawParticles();
    coins.forEach(c => {
        ctx.save();
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(c.x + c.width/2, c.y + c.height/2, c.width/2, 0, Math.PI*2); ctx.fill();
        // Coin shine
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c.x + c.width/2 - 4, c.y + c.height/2 - 4, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    });
    enemies.forEach(e => drawVehicle(ctx, e.x, e.y, e.width, e.height, e.color, currentMode));
    drawVehicle(ctx, player.x, player.y, player.width, player.height, player.color, currentMode);
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

function togglePause() {
    isGamePaused = !isGamePaused;
    if (isGamePaused) UI.pauseScreen.classList.remove('hidden');
    else UI.pauseScreen.classList.add('hidden');
}

window.onload = () => {
    UI.btnStart.onclick = () => initGame();
    UI.btnRestart.onclick = () => initGame();
    UI.btnPause.onclick = () => { if(isGameStarted && !isGameOver) togglePause(); };
    UI.btnResume.onclick = () => togglePause();
    UI.btnShop.onclick = () => { if(!isGameOver) { isGamePaused = true; UI.shopScreen.classList.remove('hidden'); if(typeof updateShopUI === 'function') updateShopUI(); } };
    UI.btnShopMenu.onclick = () => { UI.startMenu.classList.add('hidden'); UI.shopScreen.classList.remove('hidden'); if(typeof updateShopUI === 'function') updateShopUI(); };
    UI.btnShopGo.onclick = () => { UI.gameOverScreen.classList.add('hidden'); UI.shopScreen.classList.remove('hidden'); if(typeof updateShopUI === 'function') updateShopUI(); };
    UI.btnShopPause.onclick = () => { UI.pauseScreen.classList.add('hidden'); UI.shopScreen.classList.remove('hidden'); if(typeof updateShopUI === 'function') updateShopUI(); };
    UI.btnCloseShop.onclick = () => {
        UI.shopScreen.classList.add('hidden'); updatePlayerCarColor();
        if (!isGameStarted) UI.startMenu.classList.remove('hidden');
        else if (isGameOver) UI.gameOverScreen.classList.remove('hidden');
        else if (isGamePaused) UI.pauseScreen.classList.remove('hidden');
    };
    ['road', 'water', 'air'].forEach(m => {
        const b = document.getElementById('mode-' + m);
        if (b) b.onclick = () => {
            document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active'); currentMode = m; draw();
        };
    });
    updatePlayerCarColor();
    showMainMenu();
    function menuLoop() { if(!isGameStarted) { draw(); requestAnimationFrame(menuLoop); } }
    menuLoop();
};
