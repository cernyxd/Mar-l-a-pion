// ====================================================================
// ZÁKLADNÍ NASTAVENÍ
// ====================================================================

const board = document.getElementById("board");
const gameInfo = document.getElementById("current-player");
const readyButton = document.getElementById("ready-button");

const WIDTH = 10;
const HEIGHT = 11;
const CELLS = WIDTH * HEIGHT;

let currentPlayer = 1; 
let gameState = 'SETUP_P1';
let selectedPiece = null; 
let cells = []; 
let playersReady = { p1: false, p2: false }; 

const RIVER_CELLS = [ 43, 46, 53, 56, 63, 66 ];


// ====================================================================
// MAPOVÁNÍ JEDNOTEK, NÁZVY A POČTY (ČESKY)
// ====================================================================

const ASSET_PATH = './assets/';

const PIECE_TOTALS = {
    mar: 1, gen: 1, spy: 1, cap: 2, kad: 3, kaprl: 4, str: 5, min_p: 6, pru: 8, bmb: 8, prap: 1
};

const PIECE_NAMES = {
    mar: 'Maršál', gen: 'Generál', spy: 'Špion', cap: 'Kapitán', kad: 'Kadet', 
    kaprl: 'Kaprál', str: 'Střelec', min_p: 'Minér', pru: 'Průzkumník', bmb: 'Bomba', 
    prap: 'Prapor' 
};

const ICON_MAP = {
    mar: 'marsal.png', gen: 'general.png', spy: 'spion.png', cap: 'kapitan.png', kad: 'kadet.png', 
    kaprl: 'kapral.png', str: 'strelec.png', min_p: 'miner.png', pru: 'pruzkumnik.png', 
    bmb: 'bomba.png', prap: 'prapor.png' 
};

const ALL_P1_PIECES = [
    { type: 'mar', count: 1 }, { type: 'gen', count: 1 }, { type: 'spy', count: 1 },
    { type: 'cap', count: 2 }, { type: 'kad', count: 3 }, { type: 'kaprl', count: 4 }, 
    { type: 'str', count: 5 }, { type: 'min_p', count: 6 }, { type: 'pru', count: 8 }, 
    { type: 'bmb', count: 8 }, { type: 'prap', count: 1 }
];

function createInitialPieceLayout(playerID) {
    const startIdx = playerID === 1 ? 0 : 70;
    const initialIndices = Array.from({ length: 40 }, (_, i) => startIdx + i);
    initialIndices.sort(() => Math.random() - 0.5); 

    let layout = {};
    let pieceIndex = 0;

    ALL_P1_PIECES.forEach(pieceData => {
        layout[pieceData.type] = [];
        for (let i = 0; i < pieceData.count; i++) {
            if (pieceIndex < 40) {
                layout[pieceData.type].push(initialIndices[pieceIndex]);
                pieceIndex++;
            }
        }
    });
    return layout;
}

let pieces = {
    p1: createInitialPieceLayout(1),
    p2: createInitialPieceLayout(2)
};


// ====================================================================
// 1. VYTVOŘENÍ HRACÍHO POLE
// ====================================================================

for (let i = 0; i < CELLS; i++) {
    const div = document.createElement("div");
    div.classList.add("cell");
    div.dataset.index = i;
    
    if (RIVER_CELLS.includes(i)) {
        div.classList.add("water");
    }

    div.addEventListener("click", onCellClick);
    board.appendChild(div);
    cells.push(div);
}

// ====================================================================
// 2. FUNKCE VYKRESLENÍ (DRAW)
// ====================================================================

/**
 * Vytvoří DOM element figurky s obalem pro podbarvení (piece-base).
 */
function createPieceElement(type) {
    // 1. Vytvoření IMG elementu (ikona figurky)
    const img = document.createElement("img");
    img.src = `${ASSET_PATH}${ICON_MAP[type]}`; 
    img.classList.add("piece-icon");
    
    // 2. Vytvoření DIV elementu (podložka/sub-dlaždice)
    const base = document.createElement("div");
    base.classList.add("piece-base"); // KLÍČOVÁ TŘÍDA PRO CSS
    base.appendChild(img);
    
    // --- PŘIDEJTE TENTO ŘÁDEK ---
    console.log(`DEBUG: Vytvářím podložku pro ${type}.`, base.outerHTML); 
    // ----------------------------
    
    return base; 
}


// script.js (NAHRAĎTE CELOU FUNKCI draw)

function draw() {
    // A. Vyčištění pole
    cells.forEach(c => {
        c.innerHTML = ""; 
        c.classList.remove("player1", "player2", "mine", "selected");
    });
    
    // B. Vykreslení figurek - Klíčové místo, kde dochází k volání nové funkce
    for (const playerKey in pieces) { 
        for (const pieceType in pieces[playerKey]) {
            const indices = pieces[playerKey][pieceType];
            
            indices.forEach(index => {
                // Pozice -1 značí zničenou figurku
                if (index !== -1 && index !== undefined && index < CELLS) {
                    const cell = cells[index];
                    
                    // !!! ZDE JE KLÍČOVÉ VOLÁNÍ !!!
                    // Vloží element (DIV s třídou .piece-base), který vrací createPieceElement
                    cell.appendChild(createPieceElement(pieceType));
                    
                    cell.classList.add(playerKey); 
                }
            });
        }
    }
    
    // C. Aktualizace hráče na tahu
    const playerText = currentPlayer === 1 ? "Hráč 1 (Červený)" : "Hráč 2 (Modrý)";
    gameInfo.textContent = playerText;
    gameInfo.className = `player-color ${currentPlayer === 1 ? 'player1' : 'player2'}`;
    
    // D. Vykreslení výběru
    if (selectedPiece) {
        cells[selectedPiece.index].classList.add("selected");
    }

    // E. Aktualizace tabulek
    updateScoreTables(); 
}


// ====================================================================
// 3. LOGIKA FIGUREK (getPieceAt, selectPiece)
// ====================================================================

function getPieceAt(index) {
    for (const playerKey in pieces) {
        const playerID = Number(playerKey.replace('p', ''));
        for (const pieceType in pieces[playerKey]) {
            const pieceIndices = pieces[playerKey][pieceType];
            const pieceIndexInArray = pieceIndices.indexOf(index);

            if (pieceIndexInArray !== -1) {
                return { player: playerID, type: pieceType, index, arrayIndex: pieceIndexInArray };
            }
        }
    }
    return null;
}

function selectPiece(player, type, index, arrayIndex) {
    if (type === 'bmb' || type === 'prap') {
        selectedPiece = null;
        return;
    }
    selectedPiece = { player, type, index, arrayIndex }; 
}


// ====================================================================
// 4. LOGIKA POHYBU FIGÚR V SETUP FÁZI (handleSetupMove)
// ====================================================================

function handleSetupMove(targetIndex, targetPiece, playerID) {
    const pKey = `p${playerID}`;

    if (selectedPiece && selectedPiece.index === targetIndex) {
        selectedPiece = null;
    } 
    else if (selectedPiece && !targetPiece) {
        if (selectedPiece.type !== 'bmb' && selectedPiece.type !== 'prap') {
            const type = selectedPiece.type;
            const arrayIndex = selectedPiece.arrayIndex;
            pieces[pKey][type][arrayIndex] = targetIndex; 
        }
        selectedPiece = null;
    } 
    else if (selectedPiece && targetPiece && targetPiece.player === playerID) {
        const targetType = targetPiece.type;
        const targetArrayIndex = targetPiece.arrayIndex;
        const selectedType = selectedPiece.type;
        const selectedArrayIndex = selectedPiece.arrayIndex;
        
        pieces[pKey][targetType][targetArrayIndex] = selectedPiece.index;
        pieces[pKey][selectedType][selectedArrayIndex] = targetIndex;
        
        selectedPiece = null;
    } 
    else if (targetPiece && targetPiece.player === playerID) {
        const info = getPieceAt(targetIndex); 
        selectPiece(playerID, info.type, info.index, info.arrayIndex);
    }

    draw();
}


// ====================================================================
// 5. LOGIKA TLAČÍTKA READY (handleReady)
// ====================================================================

function handleReady() {
    if (gameState === 'SETUP_P1') {
        playersReady.p1 = true;
        gameState = 'SETUP_P2';
        currentPlayer = 2;
        readyButton.textContent = "Hráč 2: Hotovo s rozestavením";
        gameInfo.className = 'player-color player2';
        
    } else if (gameState === 'SETUP_P2') {
        playersReady.p2 = true;
        gameState = 'PLAYING';
        currentPlayer = 1; 
        readyButton.textContent = "Hra běží";
        readyButton.disabled = true;
    } 
    draw(); 
}

// ====================================================================
// 6. LOGIKA KLIKNUTÍ (onCellClick)
// ====================================================================

function onCellClick(e) {
    const index = Number(e.currentTarget.dataset.index); 
    const targetPiece = getPieceAt(index);
    
    if (gameState === 'SETUP_P1' && currentPlayer === 1) {
        handleSetupMove(index, targetPiece, 1);
    } else if (gameState === 'SETUP_P2' && currentPlayer === 2) {
        handleSetupMove(index, targetPiece, 2);
    } else if (gameState === 'PLAYING') {
        console.log("Hra běží. Implementujte pohyb a boj.");
    }
}

// ====================================================================
// 7. AKTUALIZACE STAVOVÝCH TABULEK (updateScoreTables)
// ====================================================================

function updateScoreTables() {
    const p1Table = document.getElementById('player1-score-table');
    const p2Table = document.getElementById('player2-score-table');
    const p1Container = p1Table.querySelector('.pieces-status-grid');
    const p2Container = p2Table.querySelector('.pieces-status-grid');

    p1Container.innerHTML = '';
    p2Container.innerHTML = '';

    function renderTable(playerKey, container) {
        const pieceTypes = Object.keys(PIECE_TOTALS);
        
        pieceTypes.forEach(type => {
            const indices = pieces[playerKey][type] || [];
            
            const currentCount = indices.filter(i => i !== -1).length; 
            const totalCount = PIECE_TOTALS[type];
            const isAlive = currentCount > 0;
            
            if (PIECE_NAMES[type] === undefined || type === 'prap') return;

            const entryDiv = document.createElement('div');
            entryDiv.classList.add('piece-entry');
            if (!isAlive) { entryDiv.classList.add('destroyed'); }
            
            const img = document.createElement('img');
            img.src = `${ASSET_PATH}${ICON_MAP[type]}`; 
            img.alt = PIECE_NAMES[type];

            const spanName = document.createElement('span');
            spanName.textContent = PIECE_NAMES[type];

            const countDiv = document.createElement('div');
            countDiv.classList.add('piece-count');
            countDiv.textContent = `${currentCount}/${totalCount}`;
            if (!isAlive) { countDiv.classList.add('destroyed'); }

            entryDiv.appendChild(img);
            entryDiv.appendChild(spanName);
            container.appendChild(entryDiv);
            container.appendChild(countDiv); 
        });
    }

    renderTable('p1', p1Container);
    renderTable('p2', p2Container);
    
    p1Table.classList.toggle('active-player', currentPlayer === 1);
    p2Table.classList.toggle('active-player', currentPlayer === 2);
}


// ====================================================================
// SPUŠTĚNÍ
// ====================================================================

readyButton.addEventListener("click", handleReady);
draw();