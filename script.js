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
let gameState = 'SETUP_P1'; // Stavy: SETUP_P1, SETUP_P2, PLAYING, GAME_OVER
let selectedPiece = null; 
let cells = []; 
let playersReady = { p1: false, p2: false }; 

// Řeka (střední řady)
const RIVER_CELLS = [ 43, 46, 53, 56, 63, 66 ];


// ====================================================================
// MAPOVÁNÍ JEDNOTEK (SÍLA, NÁZVY, IKONY)
// ====================================================================

const ASSET_PATH = './assets/';

// 1. Definiční tabulka síly (PRO BOJ)
const PIECE_RANKS = {
    mar: 10, gen: 9, cap: 8, kad: 7, kaprl: 6, str: 5, 
    min_p: 4, pru: 3, spy: 2, bmb: 11, prap: 0
};

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

const ALL_PIECE_DATA = [
    { type: 'mar', count: 1 }, { type: 'gen', count: 1 }, { type: 'spy', count: 1 },
    { type: 'cap', count: 2 }, { type: 'kad', count: 3 }, { type: 'kaprl', count: 4 }, 
    { type: 'str', count: 5 }, { type: 'min_p', count: 6 }, { type: 'pru', count: 8 }, 
    { type: 'bmb', count: 8 }, { type: 'prap', count: 1 }
];

function createInitialPieceLayout(playerID) {
    // P1 (Hráč 1) se rozestavuje dole (indexy 70-109). Start řada 7.
    // P2 (Hráč 2) se rozestavuje nahoře (indexy 0-39). Start řada 0.
    const startIdx = playerID === 1 ? 70 : 0; 
    const initialIndices = Array.from({ length: 40 }, (_, i) => startIdx + i);
    initialIndices.sort(() => Math.random() - 0.5); 

    let layout = {};
    let pieceIndex = 0;

    ALL_PIECE_DATA.forEach(pieceData => {
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
    player1: createInitialPieceLayout(1),
    player2: createInitialPieceLayout(2)
};


// ====================================================================
// 1. VYTVOŘENÍ HRACÍHO POLE (DOM)
// ====================================================================

function createBoardDOM() {
    board.innerHTML = '';
    cells = []; 

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
}

// ====================================================================
// 2. FUNKCE VYKRESLENÍ (DRAW)
// ====================================================================

function createPieceElement(type, isHidden) {
    const img = document.createElement("img");
    img.src = `${ASSET_PATH}${ICON_MAP[type]}`; 
    img.classList.add("piece-icon");
    
    const base = document.createElement("div");
    base.classList.add("piece-base");
    
    // Pokud je skrytá, přidáme třídu .hidden (pro soupeřovy figurky)
    if (isHidden) {
        base.classList.add("hidden");
    }

    // --- Logika pro zobrazení síly: VYJÍMÁME Bombu a Prapor ---
    if (type !== 'bmb' && type !== 'prap') {
        const rank = PIECE_RANKS[type];
        const rankElement = document.createElement("div");
        rankElement.classList.add("piece-rank");
        
        // Pro ostatní se použije hodnota síly (10 pro Maršála, 2 pro Špiona atd.)
        rankElement.textContent = rank;

        base.appendChild(rankElement);
    }
    // --- Konec logiky pro zobrazení síly ---

    base.appendChild(img);
    return base; 
}

function draw() {
    // A. Vyčištění
    cells.forEach(c => {
        c.innerHTML = ""; 
        c.classList.remove("p1", "p2", "mine", "selected");
    });
    
    // B. Vykreslení figurek
    for (const playerKey in pieces) { 
        const ownerID = playerKey === 'player1' ? 1 : 2;

        for (const pieceType in pieces[playerKey]) {
            const indices = pieces[playerKey][pieceType];
            
            indices.forEach(index => {
                if (index !== -1 && index !== undefined && index < CELLS) {
                    const cell = cells[index];
                    
                    // --- LOGIKA SKRÝVÁNÍ ---
                    let isHidden = false;

                    // 1. PLAYING: Skrýt soupeřovy figurky
                    if (gameState === 'PLAYING' && ownerID !== currentPlayer) {
                        isHidden = true;
                    }
                    // 2. SETUP: Skrýt figurky druhého hráče (toho, který právě nerozestavuje)
                    else if (gameState.startsWith('SETUP') && ownerID !== currentPlayer) {
                        isHidden = true;
                    }
                    
                    // Vytvoření a vložení
                    cell.appendChild(createPieceElement(pieceType, isHidden));
                    
                    // Přidání barvy hráče (pro CSS)
                    cell.classList.add(ownerID === 1 ? 'p1' : 'p2'); 
                }
            });
        }
    }
    
    // C. Info panel
    const playerText = currentPlayer === 1 ? "Hráč 1 (Červený)" : "Hráč 2 (Bílý)";
    gameInfo.textContent = playerText;
    gameInfo.className = `player-color ${currentPlayer === 1 ? 'p1' : 'p2'}`;
    
    // D. Výběr
    if (selectedPiece) {
        if (cells[selectedPiece.index]) {
            const base = cells[selectedPiece.index].querySelector('.piece-base');
            if (base) base.classList.add("selected");
        }
    }

    // E. Tabulky
    updateScoreTables(); 
}


// ====================================================================
// 3. LOGIKA VÝBĚRU A VALIDACE
// ====================================================================

function getPieceAt(index) {
    for (const playerKey in pieces) {
        const playerID = playerKey === 'player1' ? 1 : 2;
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
    // V SETUP fázi povolujeme výběr Bomby a Praporu pro rozestavení.
    // V PLAYING fázi je blokujeme.
    if (gameState === 'PLAYING') {
        if (type === 'bmb' || type === 'prap') {
            selectedPiece = null;
            return;
        }
    }
    selectedPiece = { player, type, index, arrayIndex }; 
}

// ... (funkce isPathBlocked a isMoveValid zůstávají nezměněny) ...

function isPathBlocked(fromIndex, toIndex, direction) {
    const min = Math.min(fromIndex, toIndex);
    const max = Math.max(fromIndex, toIndex);
    const step = direction === 'horizontal' ? 1 : WIDTH;

    // Kontrola polí mezi startem a cílem
    for (let i = min + step; i < max; i += step) {
        if (RIVER_CELLS.includes(i) || getPieceAt(i)) { // Použijeme RIVER_CELLS
            return true;
        }
    }
    return false;
}

function isMoveValid(fromIndex, toIndex, pieceType) {
    const toCell = cells[toIndex];
    if (!toCell || RIVER_CELLS.includes(toIndex)) return false; // Kontrola cílové buňky a řeky

    // Vlastní figurka
    const targetPiece = getPieceAt(toIndex);
    if (targetPiece && targetPiece.player === currentPlayer) return false; 
    
    if (fromIndex === toIndex) return false;

    const fromX = fromIndex % WIDTH;
    const fromY = Math.floor(fromIndex / WIDTH);
    const toX = toIndex % WIDTH;
    const toY = Math.floor(toIndex / WIDTH);

    const dx = Math.abs(fromX - toX);
    const dy = Math.abs(fromY - toY);
    const distance = dx + dy;

    // 3. Průzkumník
    if (pieceType === 'pru') {
        if (dx > 0 && dy > 0) return false; // Diagonálně ne
        if (dx > 0) return !isPathBlocked(fromIndex, toIndex, 'horizontal');
        if (dy > 0) return !isPathBlocked(fromIndex, toIndex, 'vertical');
        return false;
    } 
    // 4. Ostatní
    else {
        return (distance === 1 && (dx === 1 || dy === 1));
    }
}

function handleCombat(attackerPiece, defenderPiece) {
    const attackerRank = PIECE_RANKS[attackerPiece.type];
    const defenderRank = PIECE_RANKS[defenderPiece.type];
    
    let winner = null; 

    // Pravidla boje
    if (attackerPiece.type === 'min_p' && defenderPiece.type === 'bmb') {
        winner = 'attacker'; 
    } else if (attackerPiece.type === 'spy' && defenderPiece.type === 'mar') {
        winner = 'attacker'; 
    } else if (defenderPiece.type === 'bmb') {
        winner = 'defender'; // Bomba zůstává, útočník umírá
    } else if (defenderPiece.type === 'prap') {
        winner = 'attacker'; 
        alert(`Hráč ${attackerPiece.player} ZÍSKAL PRAPOR A VYHRÁL!`);
        gameState = 'GAME_OVER';
    } 
    else if (attackerRank > defenderRank) {
        winner = 'attacker';
    } else if (defenderRank > attackerRank) {
        winner = 'defender';
    } else {
        winner = 'both';
    }

    const pKeyAttacker = `player${attackerPiece.player}`;
    const pKeyDefender = `player${defenderPiece.player}`;

    // Aplikace výsledku
    let attackerSurvives = true;
    
    if (winner === 'attacker' || winner === 'both') {
        pieces[pKeyDefender][defenderPiece.type][defenderPiece.arrayIndex] = -1; // Obránce pryč
    }
    
    if (winner === 'defender' || winner === 'both') {
        pieces[pKeyAttacker][attackerPiece.type][attackerPiece.arrayIndex] = -1; // Útočník pryč
        attackerSurvives = false;
    }

    return attackerSurvives; // Vrací, zda se útočník posouvá (přežil a vyhrál)
}


// ====================================================================
// 4. LOGIKA POHYBU (SETUP) - OPRAVENO ROZESTAVOVÁNÍ
// ====================================================================

function handleSetupMove(targetIndex, targetPiece, playerID) {
    const pKey = `player${playerID}`;

    // 1. OMEZENÍ ZÓNY: **KLÍČOVÁ OPRAVA (ZNOVU OVĚŘENO)**
    // P1 (Hráč 1) se rozestavuje v zóně 70-109. Nesmí být < 70.
    if (playerID === 1 && targetIndex < 70) {
        return; 
    }
    // P2 (Hráč 2) se rozestavuje v zóně 0-39. Nesmí být >= 40.
    if (playerID === 2 && targetIndex >= 40) {
        return; 
    }
    
    // 2. LOGIKA KLIKNUTÍ
    
    // A. Zrušení výběru (kliknutí na stejnou figurku)
    if (selectedPiece && selectedPiece.index === targetIndex) {
        selectedPiece = null;
    } 
    // B. Přesun na prázdné pole
    else if (selectedPiece && !targetPiece) {
        const type = selectedPiece.type;
        const arrayIndex = selectedPiece.arrayIndex;
        pieces[pKey][type][arrayIndex] = targetIndex; 
        selectedPiece = null;
    } 
    // C. Výměna s jinou vlastní figurkou (SWAP)
    else if (selectedPiece && targetPiece && targetPiece.player === playerID) {
        const targetType = targetPiece.type;
        const targetArrayIndex = targetPiece.arrayIndex;
        const selectedType = selectedPiece.type;
        const selectedArrayIndex = selectedPiece.arrayIndex;
        
        // SWAP: Prohodí indexy
        pieces[pKey][targetType][targetArrayIndex] = selectedPiece.index;
        pieces[pKey][selectedType][selectedArrayIndex] = targetIndex;
        
        selectedPiece = null;
    } 
    // D. První výběr figurky (pokud je moje)
    else if (targetPiece && targetPiece.player === playerID) {
        selectPiece(targetPiece.player, targetPiece.type, targetPiece.index, targetPiece.arrayIndex);
    }

    draw();
}


// ====================================================================
// 5. READY TLAČÍTKO
// ====================================================================

function handleReady() {
    if (gameState === 'SETUP_P1') {
        playersReady.p1 = true;
        gameState = 'SETUP_P2';
        currentPlayer = 2; // Přepne na hráče 2
        readyButton.textContent = "Hráč 2: Hotovo s rozestavením";
        gameInfo.className = 'player-color p2';
        selectedPiece = null;
        
    } else if (gameState === 'SETUP_P2') {
        playersReady.p2 = true;
        gameState = 'PLAYING';
        currentPlayer = 1; // Začíná hráč 1
        readyButton.textContent = "Hra běží";
        readyButton.disabled = true;
        selectedPiece = null;
    } 
    draw(); 
}

// ====================================================================
// 6. KLIKNUTÍ (HLAVNÍ ROZCESTNÍK)
// ====================================================================

function onCellClick(e) {
    if (gameState === 'GAME_OVER') return;

    const cell = e.target.closest('.cell');
    if (!cell) return;
    
    const index = Number(cell.dataset.index); 
    const targetPiece = getPieceAt(index);
    
    // 1. SETUP FÁZE
    if (gameState.startsWith('SETUP')) {
        // Zde voláme logiku rozestavování, pokud je hráč na tahu
        if ((gameState === 'SETUP_P1' && currentPlayer === 1) || (gameState === 'SETUP_P2' && currentPlayer === 2)) {
            handleSetupMove(index, targetPiece, currentPlayer);
        }
    } 
    
    // 2. PLAYING FÁZE
    else if (gameState === 'PLAYING') {
        
        // A. Výběr vlastní figurky
        if (targetPiece && targetPiece.player === currentPlayer) {
            if (selectedPiece && selectedPiece.index === index) {
                selectedPiece = null; // Zrušit výběr
            } else {
                selectPiece(targetPiece.player, targetPiece.type, targetPiece.index, targetPiece.arrayIndex);
            }
        }
        // B. Pohyb nebo Útok
        else if (selectedPiece) {
            // Validace pohybu
            if (isMoveValid(selectedPiece.index, index, selectedPiece.type)) {
                
                let moveSuccess = true;

                // Je tam nepřítel? -> BOJ
                if (targetPiece && targetPiece.player !== currentPlayer) {
                    moveSuccess = handleCombat(selectedPiece, targetPiece);
                }

                // Pokud boj vyhrál útočník (nebo šlo o pohyb na prázdno)
                if (moveSuccess) {
                    const pKey = `player${currentPlayer}`;
                    pieces[pKey][selectedPiece.type][selectedPiece.arrayIndex] = index;
                }

                // Konec tahu, pokud nedošlo k GAME_OVER
                if (gameState !== 'GAME_OVER') {
                    selectedPiece = null;
                    currentPlayer = currentPlayer === 1 ? 2 : 1;
                }
            }
        }
    }
    
    draw();
}

// ====================================================================
// 7. TABULKY
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
            if (PIECE_NAMES[type] === undefined || type === 'prap') return;

            const indices = pieces[playerKey][type] || [];
            const currentCount = indices.filter(i => i !== -1).length; 
            const totalCount = PIECE_TOTALS[type];
            const isAlive = currentCount > 0;

            const entryDiv = document.createElement('div');
            entryDiv.classList.add('piece-entry');
            if (!isAlive) { entryDiv.classList.add('destroyed'); }
            
            const img = document.createElement('img');
            img.src = `${ASSET_PATH}${ICON_MAP[type]}`; 
            
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

    renderTable('player1', p1Container);
    renderTable('player2', p2Container);
    
    p1Table.classList.toggle('active-player', currentPlayer === 1);
    p2Table.classList.toggle('active-player', currentPlayer === 2);
}


// ====================================================================
// SPUŠTĚNÍ
// ====================================================================
createBoardDOM();
readyButton.addEventListener("click", handleReady);
draw();