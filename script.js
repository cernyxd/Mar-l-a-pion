// ====================================================================
// ZÁKLADNÍ NASTAVENÍ A PROMĚNNÉ
// ====================================================================

const board = document.getElementById("board");
const gameInfo = document.getElementById("current-player");
const readyButton = document.getElementById("ready-button");
const lobbyControls = document.getElementById("lobby-controls");
const mainLayout = document.getElementById("main-layout");
const createGameBtn = document.getElementById("create-game-btn");
const joinGameBtn = document.getElementById("join-game-btn");
const roomCodeInput = document.getElementById("room-code-input");
const lobbyStatus = document.getElementById("lobby-status");
const gameCodeDisplay = document.getElementById("game-code-display");

const WIDTH = 10;
const HEIGHT = 10; 
const CELLS = WIDTH * HEIGHT;

let roomId = null; 
let myPlayerID = null; 
let currentPlayer = 1; 
let gameState = 'LOBBY'; 
let selectedPiece = null; 
let cells = []; 
let pieces = {}; 
let playersReady = { p1: false, p2: false }; 

// Řeka (indexy polí)
const RIVER_CELLS = [ 42, 43, 46, 47, 52, 53, 56, 57 ]; 

const ASSET_PATH = './assets/';

// ====================================================================
// DEFINICE JEDNOTEK - OPRAVA POČTŮ NA 40
// ====================================================================

const PIECE_RANKS = {
    mar: 10, gen: 9, cap: 8, kad: 7, kaprl: 6, str: 5, 
    min_p: 4, pru: 3, spy: 2, bmb: 11, prap: 0
};

// Zde musí součet dát 40!
// Úprava: Kapitáni (cap) z 2 na 4. (Standardní Stratego setup)
const PIECE_TOTALS = {
    mar: 1, gen: 1, spy: 1, cap: 4, kad: 3, kaprl: 4, str: 5, min_p: 6, pru: 8, bmb: 6, prap: 1 
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

// Generujeme pole dat dynamicky podle PIECE_TOTALS, aby to sedělo
const ALL_PIECE_DATA = Object.keys(PIECE_TOTALS).map(type => ({
    type: type,
    count: PIECE_TOTALS[type]
}));

// ====================================================================
// POMOCNÉ FUNKCE
// ====================================================================

function createInitialPieceLayout(playerID) {
    const startIdx = playerID === 1 ? 60 : 0; // P1 dole (60-99), P2 nahoře (0-39)
    // Přesně 40 indexů
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

function generateRoomId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function getPieceAt(index) {
    if (!pieces.player1 || !pieces.player2) return null;
    
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

// ====================================================================
// LOBBY A PŘIPOJENÍ
// ====================================================================

function createGame() {
    roomId = generateRoomId();
    myPlayerID = 1;

    createGameBtn.disabled = true;
    joinGameBtn.disabled = true;
    roomCodeInput.disabled = true;
    lobbyStatus.textContent = "Vytvářím hru...";

    const initialPieces = {
        player1: createInitialPieceLayout(1),
        player2: createInitialPieceLayout(2)
    };

    const initialRoomData = {
        state: 'SETUP_P1', 
        turn: 1, 
        players: { p1: true, p2: false },
        pieces: initialPieces,
        playersReady: { p1: false, p2: false }
    };

    database.ref('rooms/' + roomId).set(initialRoomData)
        .then(() => {
            startGame(roomId);
        })
        .catch(error => {
            console.error(error);
            lobbyStatus.textContent = "Chyba při vytváření.";
            createGameBtn.disabled = false;
        });
}

function joinGame() {
    const inputRoomId = roomCodeInput.value.trim();
    if (inputRoomId.length !== 4) {
        alert("Zadejte 4-místný kód.");
        return;
    }

    createGameBtn.disabled = true;
    joinGameBtn.disabled = true;
    lobbyStatus.textContent = "Připojuji se...";
    
    database.ref('rooms/' + inputRoomId).once('value')
        .then(snapshot => {
            const room = snapshot.val();
            if (!room) {
                alert("Místnost neexistuje.");
                resetLobby();
                return;
            }
            if (room.players.p2) {
                alert("Místnost je plná.");
                resetLobby();
                return;
            }

            roomId = inputRoomId;
            myPlayerID = 2;
            
            database.ref('rooms/' + roomId + '/players/p2').set(true)
                .then(() => startGame(roomId));
        })
        .catch(error => {
            console.error(error);
            lobbyStatus.textContent = "Chyba připojení.";
            resetLobby();
        });
}

function resetLobby() {
    createGameBtn.disabled = false;
    joinGameBtn.disabled = false;
    roomCodeInput.disabled = false;
    lobbyStatus.textContent = "Čekám na volbu...";
}

// ====================================================================
// START HRY A REAL-TIME LISTENERS
// ====================================================================

function startGame(id) {
    createBoardDOM();
    
    lobbyControls.style.display = 'none';
    mainLayout.style.display = 'flex'; 
    
    gameCodeDisplay.textContent = `Kód místnosti: ${id} | Jsi Hráč ${myPlayerID}`;

    database.ref('rooms/' + id).on('value', (snapshot) => {
        const roomData = snapshot.val();
        
        if (!roomData) {
            alert("Místnost byla zrušena.");
            location.reload();
            return;
        }

        gameState = roomData.state;
        currentPlayer = roomData.turn;
        pieces = roomData.pieces || pieces;
        playersReady = roomData.playersReady || { p1: false, p2: false };

        updateInfoPanel();
        updateReadyButtonState(); 
        updateScoreTables(); // Zde se volá opravená funkce
        draw(); 
    });
}

// ====================================================================
// VYKRESLOVÁNÍ (DOM) - OPRAVENÁ VIDITELNOST
// ====================================================================

function createBoardDOM() {
    board.innerHTML = '';
    cells = [];
    for (let i = 0; i < CELLS; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.index = i;

        if (RIVER_CELLS.includes(i)) {
            cell.classList.add("river");
        } else {
            cell.addEventListener("click", onCellClick);
        }

        board.appendChild(cell);
        cells.push(cell);
    }
}

function draw() {
    // 1. Vyčistit
    cells.forEach(cell => {
        while (cell.firstChild) cell.removeChild(cell.firstChild);
        const base = cell.querySelector('.piece-base');
        if (base) base.classList.remove('selected');
    });

    if (!pieces.player1 || !pieces.player2) return;

    ['player1', 'player2'].forEach(pKey => {
        const pID = pKey === 'player1' ? 1 : 2;
        const isMe = (pID === myPlayerID);
        const isSetup = gameState.startsWith('SETUP');
        
        // --- LOGIKA VIDITELNOSTI (Fog of War) ---
        // 1. V SETUP fázi: Soupeřovy figurky VŮBEC nevidím.
        if (isSetup && !isMe) {
            return; // Přeskočíme vykreslení cizích figurek v setupu
        }

        // 2. Ve HŘE: Soupeřovy figurky vidím, ale skrytě (pokud není konec hry)
        const showContent = isMe || gameState === 'GAME_OVER';

        for (const type in pieces[pKey]) {
            pieces[pKey][type].forEach((index, arrayIdx) => {
                if (index !== -1 && cells[index]) {
                    
                    // Vytvoříme element s ohledem na showContent
                    const pieceEl = createPieceElement(type, pID, showContent);
                    
                    // Indikace výběru (jen moje)
                    if (isMe && selectedPiece && 
                        selectedPiece.player === pID && 
                        selectedPiece.type === type && 
                        selectedPiece.arrayIndex === arrayIdx) {
                        pieceEl.classList.add("selected");
                    }

                    cells[index].appendChild(pieceEl);
                }
            });
        }
    });
}

function createPieceElement(type, playerID, showContent) {
    const base = document.createElement("div");
    base.classList.add("piece-base");
    if (playerID === 1) base.classList.add("player1-piece");
    else base.classList.add("player2-piece");

    // Pokud nemám vidět obsah (soupeř ve hře), nevykreslím ikonku ani text, jen "rub"
    if (!showContent) {
        base.style.backgroundColor = playerID === 1 ? '#d32f2f' : '#1976d2';
        base.style.border = '2px solid white';
        // Můžeme přidat otazník
        const qmark = document.createElement('span');
        qmark.textContent = '?';
        qmark.style.color = 'white';
        qmark.style.fontSize = '20px';
        base.appendChild(qmark);
        
        return base;
    }

    // Pokud MÁM vidět obsah:
    const img = document.createElement("img");
    img.src = `${ASSET_PATH}${ICON_MAP[type]}`; 
    img.classList.add("piece-icon");
    base.appendChild(img);

    // Zobrazení síly (kromě bomby a praporu)
    if (type !== 'bmb' && type !== 'prap') {
        const rankDiv = document.createElement("div");
        rankDiv.textContent = PIECE_RANKS[type];
        rankDiv.style.position = "absolute";
        rankDiv.style.top = "-5px";
        rankDiv.style.right = "-5px";
        rankDiv.style.background = "gold";
        rankDiv.style.borderRadius = "50%";
        rankDiv.style.width = "15px";
        rankDiv.style.height = "15px";
        rankDiv.style.fontSize = "10px";
        rankDiv.style.lineHeight = "15px";
        rankDiv.style.color = "black";
        rankDiv.style.fontWeight = "bold";
        rankDiv.style.zIndex = "5";
        base.appendChild(rankDiv);
    }

    return base;
}

function updateInfoPanel() {
    let text = "";
    if (gameState.startsWith('SETUP')) {
        text = (gameState === 'SETUP_P1') ? "Rozestavuje Hráč 1" : "Rozestavuje Hráč 2";
    } else if (gameState === 'PLAYING') {
        text = (currentPlayer === 1) ? "Hráč 1" : "Hráč 2";
    } else if (gameState === 'GAME_OVER') {
        text = "KONEC HRY";
    }
    
    gameInfo.textContent = text;
    gameInfo.className = (currentPlayer === 1) ? "player-color p1" : "player-color p2";
}

function updateReadyButtonState() {
    if (gameState === 'GAME_OVER') {
        readyButton.style.display = 'none';
        return;
    }
    
    // Zobrazíme tlačítko jen pokud je viditelné pro daného hráče ve správné fázi
    readyButton.style.display = 'block';

    if (gameState === 'SETUP_P1') {
        if (myPlayerID === 1) {
            readyButton.textContent = "Dokončit rozestavení (Hráč 1)";
            readyButton.disabled = false;
        } else {
            readyButton.textContent = "Čekám na Hráče 1...";
            readyButton.disabled = true;
        }
    } else if (gameState === 'SETUP_P2') {
        if (myPlayerID === 2) {
            readyButton.textContent = "Dokončit rozestavení (Hráč 2)";
            readyButton.disabled = false;
        } else {
            readyButton.textContent = "Čekám na Hráče 2...";
            readyButton.disabled = true;
        }
    } else {
        readyButton.style.display = 'none'; 
    }
}

// ====================================================================
// TABULKY SKÓRE (OPRAVENO)
// ====================================================================

// ====================================================================
// 7. TABULKY - OPRAVENO GENERování pro 2 sloupce
// ====================================================================

// ...
// ====================================================================
// 7. TABULKY - OPRAVENO GENERování pro 1 sloupec (jeden řádek = jedna položka)
// ====================================================================

function updateScoreTables() {
    const p1Table = document.getElementById('player1-score-table');
    const p2Table = document.getElementById('player2-score-table');
    const p1Container = p1Table.querySelector('.pieces-status-grid');
    const p2Container = p2Table.querySelector('.pieces-status-grid');

    if (!p1Container || !p2Container || !pieces.player1 || !pieces.player2) return;

    p1Container.innerHTML = '';
    p2Container.innerHTML = '';

    function renderTable(playerKey, container) {
        const pieceTypes = Object.keys(PIECE_TOTALS);
        
        pieceTypes.forEach(type => {
            // Prapor se v tabulce nesleduje
            if (type === 'prap') return; 

            const indices = pieces[playerKey][type] || [];
            const currentCount = indices.filter(i => i !== -1).length; 
            const totalCount = PIECE_TOTALS[type];
            const isAlive = currentCount > 0;

            // Hlavní kontejner pro jednu položku (jeden řádek v tabulce)
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('piece-entry'); 
            
            if (!isAlive) { 
                entryDiv.classList.add('destroyed'); 
            }
            
            // Kontejner pro ikonku a název (levá strana)
            const nameContainer = document.createElement('span');
            nameContainer.style.display = 'flex';
            nameContainer.style.alignItems = 'center';
            
            // Ikonka
            const img = document.createElement('img');
            img.src = `${ASSET_PATH}${ICON_MAP[type]}`; 
            
            // Název
            const spanName = document.createElement('span');
            spanName.textContent = PIECE_NAMES[type];

            nameContainer.appendChild(img);
            nameContainer.appendChild(spanName);
            
            // Počet (pravá strana)
            const countSpan = document.createElement('span');
            countSpan.textContent = `${currentCount}/${totalCount}`;

            // Sestavení finálního řádku: Ikonka+Název vlevo, Počet vpravo
            entryDiv.appendChild(nameContainer);
            entryDiv.appendChild(countSpan);
            
            // Přidáme jen JEDEN prvek pro celý řádek
            container.appendChild(entryDiv);
        });
    }

    renderTable('player1', p1Container);
    renderTable('player2', p2Container);
    
    // Zvýraznění aktivního hráče
    p1Table.classList.toggle('active-player', currentPlayer === 1);
    p2Table.classList.toggle('active-player', currentPlayer === 2);
}
// ...

// ====================================================================
// LOGIKA HRY A KLIKÁNÍ
// ====================================================================

function selectPiece(player, type, index, arrayIndex) {
    if (gameState === 'PLAYING') {
        if (type === 'bmb' || type === 'prap') {
            selectedPiece = null;
            return;
        }
    }
    selectedPiece = { player, type, index, arrayIndex }; 
}

function handleReady() {
    if (gameState === 'SETUP_P1' && myPlayerID === 1) {
        database.ref('rooms/' + roomId).update({
            state: 'SETUP_P2',
            turn: 2
        });
    } else if (gameState === 'SETUP_P2' && myPlayerID === 2) {
        database.ref('rooms/' + roomId).update({
            state: 'PLAYING',
            turn: 1 
        });
    }
}

function handleSetupMove(targetIndex, targetPiece, playerID) {
    if (playerID !== myPlayerID) return;  
    const pKey = `player${playerID}`;

    if (playerID === 1 && targetIndex < 60) return; 
    if (playerID === 2 && targetIndex >= 40) return; 
    
    if (selectedPiece && selectedPiece.index === targetIndex) {
        selectedPiece = null; 
    } else if (selectedPiece && !targetPiece) {
        pieces[pKey][selectedPiece.type][selectedPiece.arrayIndex] = targetIndex; 
        selectedPiece = null;
        updateDBPieces(); 
    } else if (selectedPiece && targetPiece && targetPiece.player === playerID) {
        pieces[pKey][targetPiece.type][targetPiece.arrayIndex] = selectedPiece.index;
        pieces[pKey][selectedPiece.type][selectedPiece.arrayIndex] = targetIndex;
        selectedPiece = null;
        updateDBPieces(); 
    } else if (targetPiece && targetPiece.player === playerID) {
        selectPiece(targetPiece.player, targetPiece.type, targetPiece.index, targetPiece.arrayIndex);
        draw(); 
    }
}

function updateDBPieces() {
    database.ref('rooms/' + roomId + '/pieces').set(pieces);
}

function onCellClick(e) {
    if (gameState === 'GAME_OVER') return;

    let cell = e.target.closest('.cell');
    if (!cell) return;
    
    const index = Number(cell.dataset.index); 
    if (RIVER_CELLS.includes(index)) return;

    const targetPiece = getPieceAt(index);
    
    if (myPlayerID !== currentPlayer) {
        console.log("Není tvůj tah!");
        return; 
    }
    
    if (gameState.startsWith('SETUP')) {
        handleSetupMove(index, targetPiece, currentPlayer);
    } 
    else if (gameState === 'PLAYING') {
        if (targetPiece && targetPiece.player === currentPlayer) {
            if (selectedPiece && selectedPiece.index === index) {
                selectedPiece = null; 
            } else {
                selectPiece(targetPiece.player, targetPiece.type, targetPiece.index, targetPiece.arrayIndex);
            }
            draw(); 
        }
        else if (selectedPiece) {
            if (isMoveValid(selectedPiece.index, index, selectedPiece.type)) {
                let moveSuccess = true;
                const pKey = `player${currentPlayer}`;
                let nextState = gameState;

                if (targetPiece && targetPiece.player !== currentPlayer) {
                    const result = handleCombat(selectedPiece, targetPiece); 
                    moveSuccess = result.attackerSurvives;
                    if (result.gameOver) nextState = 'GAME_OVER';
                }

                if (moveSuccess) {
                    pieces[pKey][selectedPiece.type][selectedPiece.arrayIndex] = index;
                }

                const nextPlayer = (nextState === 'GAME_OVER') ? currentPlayer : (currentPlayer === 1 ? 2 : 1);
                
                database.ref('rooms/' + roomId).update({
                    pieces: pieces,
                    turn: nextPlayer,
                    state: nextState
                });

                selectedPiece = null;
            }
        }
    }
}

function handleCombat(attacker, defender) {
    const attRank = PIECE_RANKS[attacker.type];
    const defRank = PIECE_RANKS[defender.type];
    const pKeyAtt = `player${attacker.player}`;
    const pKeyDef = `player${defender.player}`;
    
    let winner = null;
    let gameOver = false;

    if (attacker.type === 'min_p' && defender.type === 'bmb') winner = 'attacker';
    else if (attacker.type === 'spy' && defender.type === 'mar') winner = 'attacker';
    else if (defender.type === 'bmb') winner = 'defender';
    else if (defender.type === 'prap') {
        winner = 'attacker';
        gameOver = true;
        alert(`Hráč ${attacker.player} vyhrál!`);
    }
    else if (attRank > defRank) winner = 'attacker';
    else if (defRank > attRank) winner = 'defender';
    else winner = 'both';

    if (winner === 'attacker' || winner === 'both') {
        pieces[pKeyDef][defender.type][defender.arrayIndex] = -1; 
    }
    if (winner === 'defender' || winner === 'both') {
        pieces[pKeyAtt][attacker.type][attacker.arrayIndex] = -1; 
    }

    return { attackerSurvives: (winner === 'attacker'), gameOver: gameOver };
}

function isPathBlocked(from, to, direction) {
    const min = Math.min(from, to);
    const max = Math.max(from, to);
    const step = direction === 'horizontal' ? 1 : WIDTH;
    for (let i = min + step; i < max; i += step) {
        if (RIVER_CELLS.includes(i) || getPieceAt(i)) return true;
    }
    return false;
}

function isMoveValid(from, to, type) {
    const toCell = cells[to];
    if (RIVER_CELLS.includes(to)) return false;
    
    const target = getPieceAt(to);
    if (target && target.player === currentPlayer) return false; 
    if (from === to) return false;

    const col1 = from % WIDTH, row1 = Math.floor(from / WIDTH);
    const col2 = to % WIDTH, row2 = Math.floor(to / WIDTH);
    const dx = Math.abs(col1 - col2);
    const dy = Math.abs(row1 - row2);

    if (type === 'pru') {
        if (dx > 0 && dy > 0) return false; 
        if (dx > 0) return !isPathBlocked(from, to, 'horizontal');
        if (dy > 0) return !isPathBlocked(from, to, 'vertical');
        return false;
    } else {
        return (dx + dy === 1);
    }
}

// ====================================================================
// EVENT LISTENERS (AKTIVACE)
// ====================================================================

createGameBtn.addEventListener("click", createGame);
joinGameBtn.addEventListener("click", joinGame);
readyButton.addEventListener("click", handleReady);