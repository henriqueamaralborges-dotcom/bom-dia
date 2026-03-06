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
    btnCloseShop: document.getElementById('btn-close-shop')
};

// Configurações do Jogo
let isGameOver = false;
let isGamePaused = false;
let frameCount = 0;
let score = 0;
let distance = 0;
let gameSpeed = 5;

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

    // Cheats para testes
    if (e.key === 'p' || e.key === 'P') {
        if (typeof totalCoins !== 'undefined') {
            totalCoins += 1000;
            if (UI.coins) UI.coins.innerText = totalCoins;
            if (typeof saveProgress === 'function') saveProgress();
        }
    }
    if (e.key === 'w' || e.key === 'W') {
        gameSpeed += 2;
    }
    if (e.key === 's' || e.key === 'S') {
        gameSpeed = Math.max(1, gameSpeed - 2);
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (e.key === 'a' || e.key === 'A') keys.a = false;
    if (e.key === 'd' || e.key === 'D') keys.d = false;
});

// Inputs (Toque - suporte básico para mobile)
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

// Listas de entidades
let enemies = [];
let coins = [];
let roadLines = [];

function initGame() {
    // Reset do estado
    isGameOver = false;
    isGamePaused = false;
    score = 0;
    distance = 0;
    gameSpeed = 5;
    frameCount = 0;
    player.x = canvas.width / 2 - player.width / 2;

    enemies = [];
    coins = [];
    roadLines = [];

    // Inicia a estrada animada
    for (let i = 0; i < canvas.height; i += 60) {
        roadLines.push({ y: i });
    }

    // Atualiza interface
    UI.gameOverScreen.classList.add('hidden');
    UI.shopScreen.classList.add('hidden');
    UI.score.innerText = '0';
    UI.coins.innerText = totalCoins; // Variável vem de shop.js

    updatePlayerCarColor();

    // Inicia loop
    requestAnimationFrame(gameLoop);
}

function spawnEnemy() {
    const width = 36;
    const height = 60;
    // Posição X aleatória garantindo que não saia da pista (margens de 20px)
    const minX = 20;
    const maxX = canvas.width - width - 20;
    const x = Math.random() * (maxX - minX) + minX;

    // Inimigos tem velocidade levemente variada da estrada (descem mais rápido)
    const speed = gameSpeed + (Math.random() * 2 + 1);

    // Cores aleatórias para inimigos
    const colors = ['#33ff33', '#3333ff', '#ff33ff', '#33ffff', '#ff9900', '#aaaaaa'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    enemies.push({ x, y: -height, width, height, speed, color });
}

function spawnCoin() {
    const size = 20;
    const minX = 25;
    const maxX = canvas.width - size - 25;
    const x = Math.random() * (maxX - minX) + minX;

    coins.push({ x, y: -size, width: size, height: size });
}

function update() {
    if (isGameOver || isGamePaused) return;

    frameCount++;
    distance += gameSpeed;

    // A cada ~10 segundos (600 frames em 60fps), aumenta a velocidade da estrada
    if (frameCount % 600 === 0) {
        gameSpeed += 0.5;
    }

    // A cada distância percorrida, ganha pontos
    if (distance > 100) {
        score += 1;
        distance = 0;
        UI.score.innerText = score;
    }

    // Movimentação do Jogador
    if (keys.ArrowLeft || keys.a) {
        player.dx = -player.speed;
    } else if (keys.ArrowRight || keys.d) {
        player.dx = player.speed;
    } else {
        player.dx = 0;
    }

    player.x += player.dx;

    // Colisão com as margens (não deixa sair da tela)
    if (player.x < 15) player.x = 15;
    if (player.x + player.width > canvas.width - 15) {
        player.x = canvas.width - player.width - 15;
    }

    // Animação das linhas da estrada
    for (let i = 0; i < roadLines.length; i++) {
        roadLines[i].y += gameSpeed;
        if (roadLines[i].y >= canvas.height) {
            roadLines[i].y -= canvas.height + 60; // Repõe no topo
        }
    }

    // Estratégia de Spawn Dinâmica baseada na velocidade
    // Quanto mais rápido o jogo, mais vezes os carros aparecem
    let spawnRate = Math.max(30, 80 - Math.floor(gameSpeed * 2));

    if (frameCount % spawnRate === 0) {
        spawnEnemy();
    }

    if (frameCount % 120 === 0) { // Aparecem moedas com menos frequência que carros
        spawnCoin();
    }

    // Atualiza Inimigos
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        e.y += e.speed;

        // Hitbox menorzinha pra ser justo (perdoar colisões de raspão)
        const margin = 4;
        if (player.x + margin < e.x + e.width - margin &&
            player.x + player.width - margin > e.x + margin &&
            player.y + margin < e.y + e.height - margin &&
            player.y + player.height - margin > e.y + margin) {
            triggerGameOver();
        }
    }

    // Limpeza de arrays
    enemies = enemies.filter(e => e.y < canvas.height);

    // Atualiza Moedas
    for (let i = 0; i < coins.length; i++) {
        let c = coins[i];
        c.y += gameSpeed;

        // Colisão com moedas
        if (player.x < c.x + c.width &&
            player.x + player.width > c.x &&
            player.y < c.y + c.height &&
            player.y + player.height > c.y) {

            // Coletou Moeda
            totalCoins += 1;
            c.collected = true;

            // Atualiza UI e Salva Setup
            UI.coins.innerText = totalCoins;
            saveProgress(); // De shop.js
        }
    }

    coins = coins.filter(c => c.y < canvas.height && !c.collected);
}

// Funções de Desenho
function drawCar(ctx, x, y, width, height, color) {
    // Sombra do carro
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 4, width, height, 5);
    ctx.fill();

    // Pneus
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x - 2, y + 10, 4, 12); // Pneu Esq Frente
    ctx.fillRect(x + width - 2, y + 10, 4, 12); // Pneu Dir Frente
    ctx.fillRect(x - 2, y + height - 22, 4, 12); // Pneu Esq Trás
    ctx.fillRect(x + width - 2, y + height - 22, 4, 12); // Pneu Dir Trás

    // Chassi Principal com Degradê
    const grad = ctx.createLinearGradient(x, y, x + width, y);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, '#ffffff33'); // Brilho leve no centro
    grad.addColorStop(1, color);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 6);
    ctx.fill();

    // Teto / Cockpit
    ctx.fillStyle = color;
    ctx.filter = 'brightness(85%)'; // Escurecer levemente a parte central
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 14, width - 8, height - 28, 4);
    ctx.fill();
    ctx.filter = 'none';

    // Parabrisas (Vidros escuros com reflexo)
    ctx.fillStyle = '#223344';
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 15, width - 10, 12, 3); // Dianteiro
    ctx.roundRect(x + 5, y + height - 25, width - 10, 10, 3); // Traseiro
    ctx.fill();

    // Reflexo no vidro dianteiro
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.rect(x + 5, y + 15, width - 10, 4);
    ctx.fill();

    // Faróis (Dianteiros - Luz branca/amarelada dependendo do status)
    ctx.fillStyle = '#ffffee'; 
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 2, 8, 5, 2); // Esq
    ctx.roundRect(x + width - 11, y + 2, 8, 5, 2); // Dir
    ctx.fill();

    // Lanternas Traseiras (Vermelho vivo)
    ctx.fillStyle = '#ff2222';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + height - 6, 10, 4, 2); // Esq
    ctx.roundRect(x + width - 13, y + height - 6, 10, 4, 2); // Dir
    ctx.fill();
    
    // Detalhe central no parachoque traseiro (Plaquinha / Exaustão)
    ctx.fillStyle = '#333';
    ctx.fillRect(x + width/2 - 4, y + height - 4, 8, 3);
}

function drawCoin(ctx, x, y, size) {
    const rx = x + size / 2;
    const ry = y + size / 2;
    const r = size / 2;

    // Sombra da moeda
    ctx.beginPath();
    ctx.arc(rx, ry + 4, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Moeda (Centro amarelo com borda mais escura)
    const grad = ctx.createRadialGradient(rx - size/4, ry - size/4, size/10, rx, ry, r);
    grad.addColorStop(0, '#ffffaa');
    grad.addColorStop(0.6, '#ffd700');
    grad.addColorStop(1, '#b8860b');

    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Borda interna brilhante
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fff172';
    ctx.beginPath();
    ctx.arc(rx, ry, r - 2, 0, Math.PI * 2);
    ctx.stroke();

    // Símbolo $ texturizado
    ctx.fillStyle = '#946c00'; // Sombra do texto
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', rx, ry + 1.5);
    
    ctx.fillStyle = '#ffffff'; // Brilho principal
    ctx.fillText('$', rx, ry - 0.5);
}

function draw() {
    // Limpa a tela
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo da Estrada (Asfalto Realista)
    ctx.fillStyle = '#383a40';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Detalhe de textura no asfalto fina (para dar sensação de velocidade)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for(let i=0; i<15; i++) {
        let rsx = (Math.sin(i * 123) * 1000) % canvas.width;
        let rsy = (i * 100 + frameCount * (gameSpeed * 1.2)) % canvas.height;
        ctx.fillRect(Math.abs(rsx), rsy, 3, 15);
    }

    // Grama / Borda (Verde escuro de corrida com sombra lateral)
    const gGradL = ctx.createLinearGradient(0, 0, 18, 0);
    gGradL.addColorStop(0, '#155d27');
    gGradL.addColorStop(1, '#0e3a19'); // escurece chegando na pista

    const gGradR = ctx.createLinearGradient(canvas.width - 18, 0, canvas.width, 0);
    gGradR.addColorStop(0, '#0e3a19'); // escurece chegando na pista
    gGradR.addColorStop(1, '#155d27');

    ctx.fillStyle = gGradL;
    ctx.fillRect(0, 0, 18, canvas.height);
    
    ctx.fillStyle = gGradR;
    ctx.fillRect(canvas.width - 18, 0, 18, canvas.height);

    // Listras laterais tipo zebra da corrida (Vermelho e Branco)
    const zebraSpeedBase = (frameCount * gameSpeed) % 60;
    for (let i = -60; i < canvas.height; i += 60) {
        ctx.fillStyle = (i + Math.floor(frameCount * gameSpeed / 60) * 60) % 120 < 60 ? '#cc0000' : '#ffffff';
        // Margem esquerda
        ctx.fillRect(18, i + zebraSpeedBase, 4, 60);
        // Margem direita
        ctx.fillRect(canvas.width - 22, i + zebraSpeedBase, 4, 60);
    }

    // Linhas centrais da Estrada tracejadas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (let i = 0; i < roadLines.length; i++) {
        // Linhas tracejadas no meio de 2 faixas com leve desfoque sombra
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.fillRect(canvas.width / 3 - 2, roadLines[i].y, 4, 30);
        ctx.fillRect((canvas.width / 3) * 2 - 2, roadLines[i].y, 4, 30);
        ctx.shadowBlur = 0;
    }

    // Moedas
    for (let c of coins) {
        let hoverY = Math.sin((frameCount + c.x) * 0.1) * 3;
        drawCoin(ctx, c.x, c.y + hoverY, c.width);
    }

    // Desenha Inimigos
    for (let e of enemies) {
        drawCar(ctx, e.x, e.y, e.width, e.height, e.color);
    }

    // Desenha Jogador com Efeito de Exaustão (Fogo/Fumaça saindo do cano de escape ao acelerar)
    if (!isGameOver && !isGamePaused && gameSpeed >= 4) {
        ctx.fillStyle = frameCount % 4 < 2 ? '#ffb700' : '#ff4400';
        ctx.beginPath();
        let fx = player.x + player.width/2;
        let fy = player.y + player.height;
        ctx.arc(fx, fy + (4 + Math.random()*6), 2 + Math.random()*2.5, 0, Math.PI*2);
        ctx.fill();
    }
    
    drawCar(ctx, player.x, player.y, player.width, player.height, player.color);
}

// Fim de Jogo
function triggerGameOver() {
    isGameOver = true;
    UI.finalScore.innerText = score;
    UI.finalCoins.innerText = totalCoins;
    UI.gameOverScreen.classList.remove('hidden');
}

// Loop Principal
function gameLoop() {
    update();
    draw();
    if (!isGameOver) {
        requestAnimationFrame(gameLoop);
    }
}

// ---------- Eventos de Botões ----------

UI.btnRestart.addEventListener('click', () => {
    initGame();
});

UI.btnShopGo.addEventListener('click', () => {
    UI.gameOverScreen.classList.add('hidden');
    UI.shopScreen.classList.remove('hidden');
    updateShopUI(); // Em shop.js
});

UI.btnShop.addEventListener('click', () => {
    if (!isGameOver) {
        isGamePaused = true;
        UI.shopScreen.classList.remove('hidden');
        updateShopUI();
    }
});

UI.btnCloseShop.addEventListener('click', () => {
    UI.shopScreen.classList.add('hidden');
    updatePlayerCarColor();

    if (!isGameOver && isGamePaused) {
        isGamePaused = false;
        requestAnimationFrame(gameLoop);
    } else if (isGameOver) {
        UI.gameOverScreen.classList.remove('hidden');
    }
});

// Inicialização imediata ao carregar o script
updatePlayerCarColor();
initGame();
