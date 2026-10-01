const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const nodesText = document.getElementById("nodes");
const restartButton = document.getElementById("restart");
const resetStatsButton = document.getElementById("resetStats");
const difficulty = document.getElementById("difficulty");
const difficultyLabel = document.getElementById("difficultyLabel"); // No change
const playerSymbolSelect = document.getElementById("playerSymbolSelect");
const playerSymbolText = document.getElementById("playerSymbol");
const aiSymbolText = document.getElementById("aiSymbol");
const roundNumberText = document.getElementById("roundNumber");
const latencyText = document.getElementById("latency");
const soundToggle = document.getElementById("soundToggle");
const playerWinsText = document.getElementById("playerWins");
const aiWinsText = document.getElementById("aiWins");
const drawsText = document.getElementById("draws");

let board = ["", "", "", "", "", "", "", "", ""];
let gameOver = false;
let nodesExplored = 0;
let aiThinking = false;
let roundNumber = 1;
let soundEnabled = true;
let aiTimer;

const savedStatistics = JSON.parse(
  localStorage.getItem("neonGridStats") || "null",
);
const statistics = savedStatistics || { playerWins: 0, aiWins: 0, draws: 0 };
let HUMAN = "X";
let AI = "O";

const winningPatterns = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

cells.forEach((cell) => {
  cell.addEventListener("click", () => {
    const index = Number(cell.dataset.index);
    if (board[index] !== "" || gameOver || aiThinking) return;
    playerMove(index);
  });
});

function playerMove(index) {
  board[index] = HUMAN;
  playTone(440, 0.06);
  updateBoard();

  if (checkGameEnd()) return;

  setStatus("AI IS THINKING...");
  aiThinking = true;
  statusText.classList.add("thinking");
  latencyText.textContent = "THINKING";

  aiTimer = setTimeout(aiMove, 400);
}

function aiMove() {
  nodesExplored = 0;
  let move;

  if (difficulty.value === "easy") {
    move = randomMove();
  } else if (difficulty.value === "medium") {
    move = mediumMove();
  } else {
    move = getBestMove();
  }

  if (move !== -1) board[move] = AI;

  nodesText.textContent = nodesExplored;
  aiThinking = false;
  statusText.classList.remove("thinking");
  latencyText.textContent = `${nodesExplored} NODES`;
  playTone(220, 0.08);
  updateBoard();
  checkGameEnd();
}

function randomMove() {
  const available = getAvailableMoves();
  if (!available.length) return -1;
  return available[Math.floor(Math.random() * available.length)];
}

function mediumMove() {
  const available = getAvailableMoves();
  if (!available.length) return -1;

  for (const move of available) {
    board[move] = AI;
    if (checkWinner(AI)) {
      board[move] = "";
      return move;
    }
    board[move] = "";
  }

  for (const move of available) {
    board[move] = HUMAN;
    if (checkWinner(HUMAN)) {
      board[move] = "";
      return move;
    }
    board[move] = "";
  }

  return randomMove();
}

function getBestMove() {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (const move of getOrderedMoves()) {
    board[move] = AI;

    const score = minimax(board, 0, false, -Infinity, Infinity);

    board[move] = "";

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimax(position, depth, maximizing, alpha, beta) {
  nodesExplored++;

  if (checkWinner(AI, position)) return 10 - depth;
  if (checkWinner(HUMAN, position)) return depth - 10;
  if (!getAvailableMoves(position).length) return 0;

  if (maximizing) {
    let bestScore = -Infinity;

    for (const move of getOrderedMoves(position)) {
      position[move] = AI;

      const score = minimax(position, depth + 1, false, alpha, beta);

      position[move] = "";
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, bestScore);

      if (beta <= alpha) break;
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const move of getOrderedMoves(position)) {
    position[move] = HUMAN;

    const score = minimax(position, depth + 1, true, alpha, beta);

    position[move] = "";
    bestScore = Math.min(bestScore, score);
    beta = Math.min(beta, bestScore);

    if (beta <= alpha) break;
  }

  return bestScore;
}

function getAvailableMoves(currentBoard = board) {
  return currentBoard
    .map((value, index) => (value === "" ? index : null))
    .filter((index) => index !== null);
}

function getOrderedMoves(currentBoard = board) {
  const movePriority = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  return getAvailableMoves(currentBoard).sort(
    (firstMove, secondMove) =>
      movePriority.indexOf(firstMove) - movePriority.indexOf(secondMove),
  );
}

function checkWinner(player, currentBoard = board) {
  return winningPatterns.some((pattern) =>
    pattern.every((index) => currentBoard[index] === player),
  );
}

function checkGameEnd() {
  if (checkWinner(HUMAN)) {
    endRound("YOU WIN", HUMAN);
    statistics.playerWins++;
    updateStatistics();
    gameOver = true;
    return true;
  }

  if (checkWinner(AI)) {
    endRound("AI WINS", AI);
    statistics.aiWins++;
    updateStatistics();
    gameOver = true;
    return true;
  }

  if (!getAvailableMoves().length) {
    endRound("DRAW GAME", null);
    statistics.draws++;
    updateStatistics();
    gameOver = true;
    return true;
  }

  setStatus("YOUR TURN - MAKE A MOVE");
  return false;
}

function updateBoard() {
  cells.forEach((cell, index) => {
    cell.textContent = board[index];
    cell.classList.remove("x", "o");

    if (board[index] === HUMAN) cell.classList.add("x");
    if (board[index] === AI) cell.classList.add("o");
    cell.setAttribute(
      "aria-label",
      board[index]
        ? `Cell ${index + 1}: ${board[index]}`
        : `Empty cell ${index + 1}`,
    );
  });
}

function endRound(message, winner) {
  statusText.querySelector("span:last-child").textContent = message;
  statusText.classList.add(
    winner === HUMAN ? "win" : winner === AI ? "loss" : "draw",
  );
  if (winner) {
    const winningLine = winningPatterns.find((pattern) =>
      pattern.every((index) => board[index] === winner),
    );
    winningLine.forEach((index) => cells[index].classList.add("winner"));
    playTone(winner === HUMAN ? 660 : 140, 0.18);
  }
  localStorage.setItem("neonGridStats", JSON.stringify(statistics));
}

function playTone(frequency, duration) {
  if (!soundEnabled) return;
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  gain.gain.setValueAtTime(0.035, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + duration,
  );
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function updateStatistics() {
  playerWinsText.textContent = statistics.playerWins;
  aiWinsText.textContent = statistics.aiWins;
  drawsText.textContent = statistics.draws;
}

restartButton.addEventListener("click", restartGame);
difficulty.addEventListener("change", () => {
  difficultyLabel.textContent =
    difficulty.options[difficulty.selectedIndex].text.toUpperCase();
  restartGame();
});
playerSymbolSelect.addEventListener("change", () => {
  HUMAN = playerSymbolSelect.value;
  AI = HUMAN === "X" ? "O" : "X";
  playerSymbolText.textContent = HUMAN;
  aiSymbolText.textContent = AI;
  restartGame();
});
resetStatsButton.addEventListener("click", () => {
  statistics.playerWins = 0;
  statistics.aiWins = 0;
  statistics.draws = 0;
  localStorage.removeItem("neonGridStats");
  updateStatistics();
  restartGame();
});
soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.classList.toggle("muted", !soundEnabled);
  soundToggle.querySelector("span").textContent = soundEnabled
    ? " SOUND"
    : " MUTED";
});

function setStatus(message) {
  statusText.querySelector("span:last-child").textContent = message;
}

function restartGame() {
  clearTimeout(aiTimer);
  board = ["", "", "", "", "", "", "", "", ""];
  gameOver = false;
  aiThinking = false;
  roundNumber++;
  roundNumberText.textContent = String(roundNumber).padStart(2, "0");
  nodesExplored = 0;
  nodesText.textContent = "0";
  setStatus("YOUR TURN - MAKE A MOVE");
  statusText.className = "status";
  latencyText.textContent = "READY";
  updateBoard();

  if (HUMAN === "O") {
    setStatus("AI IS THINKING...");
    aiThinking = true;
    statusText.classList.add("thinking");
    latencyText.textContent = "THINKING";
    aiTimer = setTimeout(aiMove, 400);
  }
}

updateBoard();
updateStatistics();
