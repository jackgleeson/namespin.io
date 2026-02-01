const COLORS = [
  '#e53935', // red
  '#1e88e5', // blue
  '#43a047', // green
  '#fdd835', // yellow
  '#8e24aa', // purple
  '#fb8c00', // orange
  '#00acc1', // cyan
  '#d81b60', // pink
];

let entries = [];
let currentRotation = 0;
let isSpinning = false;
let spinDuration = 10000;
let selectedWinner = null;
let history = [];

// Cryptographically secure random number generator
// Returns a random float in [0, 1) just like Math.random()
function secureRandom() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}

const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const entriesText = document.getElementById('entriesText');
const entryCount = document.getElementById('entryCount');
const historyCount = document.getElementById('historyCount');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const winnerModal = document.getElementById('winnerModal');
const winnerName = document.getElementById('winnerName');
const closeModal = document.getElementById('closeModal');

function updateCount() {
  entryCount.textContent = `(${entries.length})`;
}

function updateHistoryCount() {
  historyCount.textContent = `(${history.length})`;
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No spins yet</div>';
  } else {
    historyList.innerHTML = history.map((name, i) => `
      <div class="history-item">
        <span>#${i + 1}</span>
        <span class="history-name">${escapeHtml(name)}</span>
      </div>
    `).join('');
  }
  updateHistoryCount();
}

function addToHistory(name) {
  history.push(name);
  renderHistory();
}

function clearHistory() {
  history = [];
  renderHistory();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getEntriesFromText() {
  return entriesText.value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function drawWheel() {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 10;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (entries.length === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ddd';
    ctx.fill();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#999';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add names to spin', centerX, centerY);
    return;
  }

  const sliceAngle = (2 * Math.PI) / entries.length;

  entries.forEach((entry, i) => {
    const startAngle = currentRotation + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    // Draw slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw text
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    const fontSize = Math.max(10, Math.min(radius * 0.08, 400 / entries.length));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 3;

    const textRadius = radius - 15;
    const maxWidth = textRadius - 50;
    let displayText = entry;

    while (ctx.measureText(displayText).width > maxWidth && displayText.length > 3) {
      displayText = displayText.slice(0, -1);
    }
    if (displayText !== entry) displayText += '…';

    ctx.fillText(displayText, textRadius, 0);
    ctx.restore();
  });

  // Draw center circle (scales with wheel size)
  const centerRadius = Math.max(25, radius * 0.1);
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function spin() {
  entries = getEntriesFromText();
  if (isSpinning || entries.length < 2) return;

  isSpinning = true;
  spinBtn.disabled = true;

  // Pick a random winner
  const winnerIndex = Math.floor(secureRandom() * entries.length);
  selectedWinner = entries[winnerIndex];
  const sliceAngle = (2 * Math.PI) / entries.length;

  // Calculate where we need to land
  const targetAngle = -((winnerIndex + 0.5) * sliceAngle);

  // Normalize to positive angle
  const normalizedTarget = ((targetAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // Add full spins
  const minSpins = 5;
  const maxSpins = 8;
  const fullSpins = Math.floor(minSpins + secureRandom() * (maxSpins - minSpins));

  const currentFullRotations = Math.floor(currentRotation / (2 * Math.PI));
  const targetRotation = (currentFullRotations + fullSpins + 1) * 2 * Math.PI + normalizedTarget;

  const startRotation = currentRotation;
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / spinDuration, 1);
    const eased = easeOutCubic(progress);

    currentRotation = startRotation + (targetRotation - startRotation) * eased;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      spinBtn.disabled = false;
      announceWinner();
    }
  }

  requestAnimationFrame(animate);
}

function createConfetti() {
  const confettiCanvas = document.createElement('canvas');
  confettiCanvas.id = 'confetti';
  confettiCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:200';
  document.body.appendChild(confettiCanvas);
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  const confettiCtx = confettiCanvas.getContext('2d');

  const pieces = [];
  const colors = COLORS;

  for (let i = 0; i < 200; i++) {
    pieces.push({
      x: secureRandom() * confettiCanvas.width,
      y: secureRandom() * confettiCanvas.height - confettiCanvas.height,
      w: secureRandom() * 12 + 6,
      h: secureRandom() * 8 + 4,
      color: colors[Math.floor(secureRandom() * colors.length)],
      vx: secureRandom() * 6 - 3,
      vy: secureRandom() * 4 + 3,
      rotation: secureRandom() * 360,
      rotationSpeed: secureRandom() * 12 - 6
    });
  }

  let frame = 0;
  function animate() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.rotation += p.rotationSpeed;

      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rotation * Math.PI / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      confettiCtx.restore();
    });

    frame++;
    if (frame < 400) {
      requestAnimationFrame(animate);
    } else {
      confettiCanvas.remove();
    }
  }
  animate();
}

function announceWinner() {
  winnerName.textContent = selectedWinner;
  winnerModal.classList.add('show');
  createConfetti();
  addToHistory(selectedWinner);
}

entriesText.addEventListener('input', () => {
  entries = getEntriesFromText();
  updateCount();
  drawWheel();
});

entriesText.addEventListener('paste', () => {
  setTimeout(() => {
    const cleaned = entriesText.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    entriesText.value = cleaned;
    entries = getEntriesFromText();
    updateCount();
    drawWheel();
  }, 0);
});

document.querySelectorAll('.time-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    spinDuration = parseInt(btn.dataset.time, 10);
  });
});

spinBtn.addEventListener('click', spin);

closeModal.addEventListener('click', () => {
  winnerModal.classList.remove('show');
});

winnerModal.addEventListener('click', (e) => {
  if (e.target === winnerModal) {
    winnerModal.classList.remove('show');
  }
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
  });
});

clearHistoryBtn.addEventListener('click', clearHistory);

// Handle canvas resize for responsive
function resizeCanvas() {
  const container = document.querySelector('.wheel-container');
  const size = Math.min(container.offsetWidth, container.offsetHeight);
  if (size > 0 && size !== canvas.width) {
    canvas.width = size;
    canvas.height = size;
    drawWheel();
  }
}

window.addEventListener('resize', resizeCanvas);

// Initial sample names
entriesText.value = `Harry Potter
Hermione Granger
Ron Weasley
SpongeBob
Patrick Star
Pikachu
Mario
Luigi
Elsa
Buzz Lightyear
Woody
Shrek
Dory
Simba
Batman`;
entries = getEntriesFromText();
updateCount();
resizeCanvas();
drawWheel();
