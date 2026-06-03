const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSfx(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'rotate') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'clear') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    }
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 900; canvas.height = 700;

const cols = 8, rows = 12, cellSize = 50;
const offsetX = (canvas.width - cols * cellSize) / 2;
const offsetY = ((canvas.height - rows * cellSize) / 2) + 60;

let score = 0, bestScore = localStorage.getItem("blockInBestScore") || 0, isPaused = false;
const menuOverlay = document.getElementById("menuOverlay"), menuTitle = document.getElementById("menuTitle");
const board = Array(rows).fill().map(() => Array(cols).fill(0));
const shapes = [[[1, 1], [1, 1]], [[1], [1], [1], [1]], [[1, 1, 1], [0, 1, 0]], [[1, 0], [1, 0], [1, 1]]];

function getRandomShape() { return shapes[Math.floor(Math.random() * shapes.length)]; }
let block = { x: 3, y: 0, shape: getRandomShape() };
let dropCounter = 0, dropInterval = 400, lastTime = 0;

function collide(currentBlock) {
    const s = currentBlock.shape;
    for (let y = 0; y < s.length; y++) {
        for (let x = 0; x < s[y].length; x++) {
            if (s[y][x] !== 0) {
                let boardX = currentBlock.x + x, boardY = currentBlock.y + y;
                if (boardY >= rows || boardX < 0 || boardX >= cols || (board[boardY] && board[boardY][boardX] !== 0)) return true;
            }
        }
    }
    return false;
}

function lockBlock() {
    block.shape.forEach((row, y) => { row.forEach((value, x) => { if (value === 1) board[block.y + y][block.x + x] = 1; }); });
    let linesCleared = 0;
    for (let r = rows - 1; r >= 0; r--) {
        if (board[r].every(cell => cell === 1)) { board.splice(r, 1); board.unshift(Array(cols).fill(0)); linesCleared++; r++; }
    }
    if (linesCleared > 0) {
        score += linesCleared * 100; playSfx('clear');
        if (score > bestScore) { bestScore = score; localStorage.setItem("blockInBestScore", bestScore); }
    }
    block = { x: 3, y: 0, shape: getRandomShape() };
    if (collide(block)) { isPaused = true; playSfx('gameover'); menuTitle.innerText = "GAME OVER"; menuOverlay.style.display = "flex"; }
}

function rotate(matrix) { return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse()); }

function draw() {
    ctx.fillStyle = "#111827"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; ctx.font = "bold 16px sans-serif";
    ctx.fillText(`BEST: ${bestScore}`, canvas.width / 2, offsetY - 85);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 56px sans-serif";
    ctx.fillText(score, canvas.width / 2, offsetY - 30);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.strokeRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
            if (board[r][c]) { ctx.fillStyle = "#00f5d4"; ctx.fillRect(offsetX + c * cellSize + 1, offsetY + r * cellSize + 1, cellSize - 2, cellSize - 2); }
        }
    }
    ctx.fillStyle = "#ff006e";
    block.shape.forEach((row, y) => { row.forEach((value, x) => { if (value) ctx.fillRect(offsetX + (block.x + x) * cellSize + 1, offsetY + (block.y + y) * cellSize + 1, cellSize - 2, cellSize - 2); }); });
}

function update(time = 0) {
    if (isPaused) { requestAnimationFrame(update); return; }
    const deltaTime = time - lastTime; lastTime = time; dropCounter += deltaTime;
    if (dropCounter > dropInterval) { block.y++; if (collide(block)) { block.y--; lockBlock(); } dropCounter = 0; }
    draw(); requestAnimationFrame(update);
}

function handleInput(action) {
    if (isPaused) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const move = { x: block.x, y: block.y, shape: block.shape };
    if (action === "left") move.x--;
    if (action === "right") move.x++;
    if (action === "down") move.y++;
    if (action === "rotate") { move.shape = rotate(block.shape); if (!collide(move)) playSfx('rotate'); }

    if (!collide(move)) {
        if (action === "left" || action === "right") playSfx('move');
        block.x = move.x; block.y = move.y; block.shape = move.shape;
    } else if (action === "down") { lockBlock(); }
    draw(); 
}

function togglePause() { if (audioCtx.state === 'suspended') audioCtx.resume(); isPaused = !isPaused; menuOverlay.style.display = isPaused ? "flex" : "none"; menuTitle.innerText = "PAUSED"; }
function resetGame() { board.forEach(row => row.fill(0)); score = 0; block = { x: 3, y: 0, shape: getRandomShape() }; isPaused = false; menuOverlay.style.display = "none"; draw(); }

window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") handleInput("left"); if (e.key === "ArrowRight") handleInput("right");
    if (e.key === "ArrowDown") handleInput("down"); if (e.key === "ArrowUp") handleInput("rotate");
    if (e.key.toLowerCase() === "p" || e.key === "Escape") togglePause();
});

const btnMap = { "leftBtn": "left", "rightBtn": "right", "downBtn": "down", "rotateBtn": "rotate" };
Object.keys(btnMap).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        btn.addEventListener("touchstart", (e) => { e.preventDefault(); handleInput(btnMap[id]); });
        btn.addEventListener("click", () => handleInput(btnMap[id]));
    }
});

document.getElementById("pauseBtn").addEventListener("click", togglePause);
document.getElementById("resumeBtn").addEventListener("click", togglePause);
document.getElementById("restartBtn").addEventListener("click", resetGame);
update();