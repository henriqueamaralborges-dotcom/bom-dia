// shop.js - Sistema de Economia e Garagem
const CARS = [
    { id: 'car1', name: 'Básico Vermelho', color: '#ff3333', price: 0 },
    { id: 'car2', name: 'Velocista Azul', color: '#3333ff', price: 50 },
    { id: 'car3', name: 'Esportivo Verde', color: '#33ff33', price: 150 },
    { id: 'car4', name: 'Bala de Prata', color: '#e0e0e0', price: 300 },
    { id: 'car5', name: 'Luxo Dourado', color: '#ffd700', price: 600 },
    { id: 'car6', name: 'Sombra da Noite', color: '#111111', price: 1200 }
];

// Estado do jogador (Carrega do LocalStorage ou define valores iniciais)
let totalCoins = parseInt(localStorage.getItem('infinityDrive_coins')) || 0;
let unlockedCars = JSON.parse(localStorage.getItem('infinityDrive_unlocked')) || ['car1'];
let selectedCarId = localStorage.getItem('infinityDrive_selected') || 'car1';

function saveProgress() {
    localStorage.setItem('infinityDrive_coins', totalCoins);
    localStorage.setItem('infinityDrive_unlocked', JSON.stringify(unlockedCars));
    localStorage.setItem('infinityDrive_selected', selectedCarId);
}

function updateShopUI() {
    const shopCoinsEl = document.getElementById('shop-coins');
    if (shopCoinsEl) shopCoinsEl.innerText = totalCoins;
    
    // Atualiza o display do HUD
    const hudCoinsEl = document.getElementById('coins');
    if (hudCoinsEl) hudCoinsEl.innerText = totalCoins;

    const shopItemsContainer = document.getElementById('shop-items');
    if (!shopItemsContainer) return;
    
    shopItemsContainer.innerHTML = '';

    CARS.forEach(car => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';

        const isUnlocked = unlockedCars.includes(car.id);
        const isSelected = selectedCarId === car.id;

        let btnContent = '';
        let btnDisabled = '';

        if (isSelected) {
            btnContent = 'Selecionado';
            btnDisabled = 'disabled';
        } else if (isUnlocked) {
            btnContent = 'Equipar';
        } else {
            btnContent = `💰 ${car.price}`;
            if (totalCoins < car.price) {
                btnDisabled = 'disabled';
            }
        }

        itemDiv.innerHTML = `
            <div class="car-preview" style="background-color: ${car.color}; border: 2px solid ${isSelected ? '#fff' : 'transparent'};"></div>
            <div class="shop-item-info">
                <h4>${car.name}</h4>
                <small style="color: #aaa">${isUnlocked ? 'Desbloqueado' : 'Não comprado'}</small>
            </div>
            <button class="btn" ${btnDisabled} onclick="handleShopClick('${car.id}')">${btnContent}</button>
        `;

        shopItemsContainer.appendChild(itemDiv);
    });
}

function handleShopClick(carId) {
    const car = CARS.find(c => c.id === carId);
    
    // Se o carro já foi desbloqueado, apenas equipa
    if (unlockedCars.includes(carId)) {
        selectedCarId = carId;
    } 
    // Se o jogador tem dinheiro suficiente, compra e equipa
    else if (totalCoins >= car.price) {
        totalCoins -= car.price;
        unlockedCars.push(carId);
        selectedCarId = carId;
    }

    saveProgress();
    updateShopUI();
    
    // Notifica o game.js para atualizar o sprite do carro (se a função existir)
    if (typeof updatePlayerCarColor === 'function') {
        updatePlayerCarColor();
    }
}

// Inicializa a UI com as moedas ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const domCoins = document.getElementById('coins');
    if(domCoins) domCoins.innerText = totalCoins;
});
