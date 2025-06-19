// Game state variables
let gridSize = 4;
let cellSize = 60;
let targetCellSize = 50;
let grid = [];
let targetPattern = [];
let hintRequested = false;
let hintCell = null;
let solutionPath = [];
let solutionMatrixA = null;
let gameWon = false;
let nextBtn;
let glowIntensity = 0;
let glowDirection = 1;
let currentScreen = 'title';
let canvas;
let canvasWidth = 600;
let canvasHeight = 800;

// Ad system variables
let adPlaying = false;
let adStartTime = 0;
let adDuration = 10000; // 10 seconds in milliseconds
let adProgress = 0;

// Touch handling variables
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;

// Hint system variables
let freeHintsRemaining = 3;
let lastHintTime = 0;
let hintCooldown = 3000; // 3 seconds in milliseconds

function setup() {
  updateCanvasSize();
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvasContainer');
  textAlign(CENTER, CENTER);
  textSize(20);
  setupEventListeners();
  gridSize = parseInt(document.getElementById('gridSizeSelect').value);
}

function updateCanvasSize() {
  const container = document.getElementById('canvasContainer');
  const containerRect = container.getBoundingClientRect();
  const maxWidth = Math.min(window.innerWidth - 40, 800);
  const maxHeight = Math.min(window.innerHeight - 200, 1000);
  const aspectRatio = 3 / 4;
  if (maxWidth / maxHeight > aspectRatio) {
    canvasWidth = maxHeight * aspectRatio;
    canvasHeight = maxHeight;
  } else {
    canvasWidth = maxWidth;
    canvasHeight = maxWidth / aspectRatio;
  }
  canvasWidth = Math.max(canvasWidth, 300);
  canvasHeight = Math.max(canvasHeight, 400);
  canvasWidth = Math.min(canvasWidth, 800);
  canvasHeight = Math.min(canvasHeight, 1000);
}

function setupEventListeners() {
  const playBtn = document.getElementById('playBtn');
  playBtn.addEventListener('click', () => {
    gridSize = parseInt(document.getElementById('gridSizeSelect').value);
    showGameScreen();
    initializeGame(gridSize);
  });
  playBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    gridSize = parseInt(document.getElementById('gridSizeSelect').value);
    showGameScreen();
    initializeGame(gridSize);
  });

  const backBtn = document.getElementById('backBtn');
  backBtn.addEventListener('click', showTitleScreen);
  backBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    showTitleScreen();
  });

  const hintBtn = document.getElementById('hintBtn');
  hintBtn.addEventListener('click', getHint);
  hintBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    getHint();
  });

  const newGameBtn = document.getElementById('newGameBtn');
  newGameBtn.addEventListener('click', () => {
    if (!adPlaying) initializeGame(gridSize);
  });
  newGameBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!adPlaying) initializeGame(gridSize);
  });

  const resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', () => {
    if (!adPlaying) resetGame();
  });
  resetBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!adPlaying) resetGame();
  });

  window.addEventListener('resize', handleResize);

  const canvasContainer = document.getElementById('canvasContainer');
  canvasContainer.style.touchAction = 'none';
  canvasContainer.addEventListener('touchstart', function(e) {
    if (currentScreen === 'game' && !gameWon && !adPlaying) {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isTouching = true;
      }
    }
  }, { passive: true });

  canvasContainer.addEventListener('touchmove', function(e) {
    if (currentScreen === 'game' && !gameWon && !adPlaying) {
      e.preventDefault();
    }
  }, { passive: false });

  canvasContainer.addEventListener('touchend', function(e) {
    if (currentScreen === 'game' && !gameWon && !adPlaying && isTouching) {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartX);
      const deltaY = Math.abs(touch.clientY - touchStartY);
      if (deltaX < 15 && deltaY < 15) {
        handleCanvasClick(touch.clientX, touch.clientY);
      }
      isTouching = false;
    }
  }, { passive: false });

  document.addEventListener('touchmove', function(e) {
    // Don't prevent default for dropdown elements
    if (e.target.closest('.custom-dropdown') || e.target.closest('.dropdown-option')) {
      return;
    }
    if (e.target.closest('#canvasContainer')) {
      e.preventDefault();
    }
  }, { passive: false });

  canvasContainer.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });

  canvasContainer.addEventListener('click', function(e) {
    if (e.pointerType === 'mouse' && currentScreen === 'game' && !gameWon && !adPlaying) {
      handleCanvasClick(e.clientX, e.clientY);
    }
  });

  // Set up the custom dropdown
  const customDropdown = document.getElementById('customDropdown');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const dropdownOptions = document.querySelectorAll('.dropdown-option');
  const selectedValueDisplay = document.getElementById('selectedValue');
  const gridSizeInput = document.getElementById('gridSizeSelect');
  
  // Initialize with default selection
  let selectedSize = 4;
  updateDropdownSelection(selectedSize);
  
  // Handle clicking on the dropdown display
  customDropdown.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown();
  });
  
  // Handle clicking on individual options
  dropdownOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const value = parseInt(option.dataset.value);
      selectDropdownOption(value);
    });
  });
  
  // Handle touch events for mobile
  customDropdown.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown();
  }, { passive: false });
  
  dropdownOptions.forEach(option => {
    option.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const value = parseInt(option.dataset.value);
      selectDropdownOption(value);
    }, { passive: false });
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!customDropdown.contains(e.target)) {
      closeDropdown();
    }
  });
  
  // Close dropdown when touching outside
  document.addEventListener('touchstart', (e) => {
    if (!customDropdown.contains(e.target)) {
      closeDropdown();
    }
  }, { passive: true });
  
  // Handle keyboard navigation
  customDropdown.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown();
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });
  
  function toggleDropdown() {
    const isOpen = customDropdown.classList.contains('open');
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }
  
  function openDropdown() {
    customDropdown.classList.add('open');
    customDropdown.setAttribute('aria-expanded', 'true');
  }
  
  function closeDropdown() {
    customDropdown.classList.remove('open');
    customDropdown.setAttribute('aria-expanded', 'false');
  }
  
  function selectDropdownOption(value) {
    selectedSize = value;
    gridSize = value;
    gridSizeInput.value = value;
    updateDropdownSelection(value);
    closeDropdown();
    console.log('Grid size changed to', value); // Debug
  }
  
  function updateDropdownSelection(value) {
    // Update the display text
    selectedValueDisplay.textContent = `${value} x ${value}`;
    
    // Update the selected option styling and accessibility
    dropdownOptions.forEach(option => {
      option.classList.remove('selected');
      option.setAttribute('aria-selected', 'false');
      if (parseInt(option.dataset.value) === value) {
        option.classList.add('selected');
        option.setAttribute('aria-selected', 'true');
      }
    });
  }
}

function handleCanvasClick(clientX, clientY) {
  if (currentScreen !== 'game' || gameWon) return;
  const canvasRect = canvas.elt.getBoundingClientRect();
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;
  const x = (canvasX / canvasRect.width) * canvasWidth;
  const y = (canvasY / canvasRect.height) * canvasHeight;
  handleGridClick(x, y);
}

function handleGridClick(x, y) {
  const targetGridWidth = gridSize * targetCellSize;
  const targetGridHeight = gridSize * targetCellSize;
  const mainGridWidth = gridSize * cellSize;
  const mainGridHeight = gridSize * cellSize;
  const targetOffsetX = (canvasWidth - targetGridWidth) / 2;
  const targetOffsetY = 40;
  const mainGridX = (canvasWidth - mainGridWidth) / 2;
  const mainGridY = targetOffsetY + targetGridHeight + 50;
  if (x >= mainGridX && x <= mainGridX + mainGridWidth &&
      y >= mainGridY && y <= mainGridY + mainGridHeight) {
    const i = Math.floor((y - mainGridY) / cellSize);
    const j = Math.floor((x - mainGridX) / cellSize);
    if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
      if (hintRequested && hintCell && hintCell[0] === i && hintCell[1] === j) {
        hintRequested = false;
        hintCell = null;
      }
      toggleCell(grid, i, j, gridSize);
      toggleCell(grid, i-1, j, gridSize);
      toggleCell(grid, i+1, j, gridSize);
      toggleCell(grid, i, j-1, gridSize);
      toggleCell(grid, i, j+1, gridSize);
      computeSolution();
      if (checkWin()) {
        gameWon = true;
        showNextButton();
      }
    }
  }
}

function handleResize() {
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  if (currentScreen === 'game') calculateCellSizes();
}

function calculateCellSizes() {
  const availableHeight = canvasHeight * 0.9;
  const availableWidth = canvasWidth * 0.98;
  const gridSpacing = 25;
  const labelHeight = 20;
  const totalGridHeight = availableHeight - gridSpacing - (labelHeight * 2);
  const targetGridHeight = totalGridHeight * 0.3;
  const playGridHeight = totalGridHeight * 0.7;
  const maxGridWidth = availableWidth;
  const maxTargetCellSizeByWidth = maxGridWidth / gridSize;
  const maxTargetCellSizeByHeight = targetGridHeight / gridSize;
  targetCellSize = Math.min(maxTargetCellSizeByWidth, maxTargetCellSizeByHeight);
  const maxPlayCellSizeByWidth = maxGridWidth / gridSize;
  const maxPlayCellSizeByHeight = playGridHeight / gridSize;
  cellSize = Math.min(maxPlayCellSizeByWidth, maxPlayCellSizeByHeight);
  const minCellSize = Math.max(25, Math.min(40, window.innerWidth / 15));
  cellSize = Math.max(cellSize, minCellSize);
  targetCellSize = Math.max(targetCellSize, minCellSize * 0.6);
  targetCellSize = Math.min(targetCellSize, cellSize * 0.7);
}

function showTitleScreen() {
  currentScreen = 'title';
  if (nextBtn) {
    nextBtn.remove();
    nextBtn = null;
  }
  document.getElementById('titleScreen').classList.add('active');
  document.getElementById('gameScreen').classList.remove('active');
}

function showGameScreen() {
  currentScreen = 'game';
  document.getElementById('titleScreen').classList.remove('active');
  document.getElementById('gameScreen').classList.add('active');
  calculateCellSizes();
}

function initializeGame(size) {
  gridSize = size;
  calculateCellSizes();
  grid = createGrid(size, size);
  targetPattern = createGrid(size, size);
  solutionMatrixA = computeAdjacencyMatrix(size);
  generateSolvablePattern(size);
  grid = createGrid(size, size);
  hintRequested = false;
  hintCell = null;
  solutionPath = [];
  computeSolution();
  gameWon = false;
  if (nextBtn) nextBtn.remove();
  
  // Reset free hints for new game
  freeHintsRemaining = 3;
  lastHintTime = 0;
  
  // Reset hint button state
  const hintBtn = document.getElementById('hintBtn');
  if (hintBtn) {
    hintBtn.disabled = false;
    hintBtn.style.opacity = '1';
    hintBtn.style.cursor = 'pointer';
    hintBtn.textContent = 'HINT';
  }
}

function resetGame() {
  grid = createGrid(gridSize, gridSize);
  hintRequested = false;
  hintCell = null;
  solutionPath = [];
  computeSolution();
  gameWon = false;
  if (nextBtn) nextBtn.remove();
}

function createGrid(rows, cols) {
  let g = new Array(rows);
  for (let i = 0; i < rows; i++) {
    g[i] = new Array(cols).fill(0);
  }
  return g;
}

function generateSolvablePattern(size) {
  let n = size * size;
  let x = Array(n).fill(0).map(() => Math.floor(random(2)));
  let b = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      b[i] = (b[i] + solutionMatrixA[i][j] * x[j]) % 2;
    }
  }
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      targetPattern[i][j] = b[i * size + j];
    }
  }
}

function toggleCell(grid, i, j, size) {
  if (i >= 0 && i < size && j >= 0 && j < size) {
    grid[i][j] = (grid[i][j] + 1) % 2;
  }
}

function computeAdjacencyMatrix(size) {
  let n = size * size;
  let A = Array(n).fill().map(() => Array(n).fill(0));
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let idx = i * size + j;
      A[idx][idx] = 1;
      if (i > 0) A[(i-1)*size + j][idx] = 1;
      if (i < size-1) A[(i+1)*size + j][idx] = 1;
      if (j > 0) A[i*size + (j-1)][idx] = 1;
      if (j < size-1) A[i*size + (j+1)][idx] = 1;
    }
  }
  return A;
}

function computeSolution() {
  let size = gridSize;
  let n = size * size;
  let b = Array(n).fill(0);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      b[i*size + j] = (targetPattern[i][j] + grid[i][j]) % 2;
    }
  }
  let A = JSON.parse(JSON.stringify(solutionMatrixA));
  let x = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let pivot = -1;
    for (let j = i; j < n; j++) {
      if (A[j][i] === 1) {
        pivot = j;
        break;
      }
    }
    if (pivot === -1) continue;
    [A[i], A[pivot]] = [A[pivot], A[i]];
    [b[i], b[pivot]] = [b[pivot], b[i]];
    for (let j = 0; j < n; j++) {
      if (j !== i && A[j][i] === 1) {
        for (let k = 0; k < n; k++) {
          A[j][k] = (A[j][k] + A[i][k]) % 2;
        }
        b[j] = (b[j] + b[i]) % 2;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    if (A[i][i] === 1) x[i] = b[i];
  }
  solutionPath = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (x[i*size + j] == 1) solutionPath.push([i, j]);
    }
  }
}

function mousePressed() {
  return false;
}

function getHint() {
  if (currentScreen !== 'game' || gameWon || adPlaying) return;
  
  const currentTime = Date.now();
  
  // Check if we're still in cooldown period
  if (currentTime - lastHintTime < hintCooldown) {
    const remainingCooldown = Math.ceil((hintCooldown - (currentTime - lastHintTime)) / 1000);
    console.log(`Hint cooldown: ${remainingCooldown} seconds remaining`);
    return;
  }
  
  // If we have free hints remaining, use one
  if (freeHintsRemaining > 0) {
    freeHintsRemaining--;
    lastHintTime = currentTime;
    console.log(`Free hint used! ${freeHintsRemaining} free hints remaining`);
    
    // Give the hint directly
    hintRequested = true;
    if (solutionPath.length === 0) {
      computeSolution();
    }
    if (solutionPath.length > 0) {
      hintCell = solutionPath.shift();
    } else {
      hintCell = null;
    }
    
    // Start cooldown timer
    startHintCooldown();
    return;
  }
  
  // No free hints left, show ad
  adPlaying = true;
  adStartTime = millis();
  adProgress = 0;
  
  const adContainer = document.getElementById('adContainer');
  adContainer.classList.remove('hidden');
  adContainer.classList.add('visible');
  
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.log('AdSense not loaded or configured');
  }
  
  updateAdTimer();
}

function startHintCooldown() {
  const hintBtn = document.getElementById('hintBtn');
  if (!hintBtn) return;
  
  // Disable the button
  hintBtn.disabled = true;
  hintBtn.style.opacity = '0.5';
  hintBtn.style.cursor = 'not-allowed';
  
  // Start countdown
  const cooldownInterval = setInterval(() => {
    const currentTime = Date.now();
    const remainingCooldown = Math.ceil((hintCooldown - (currentTime - lastHintTime)) / 1000);
    
    if (remainingCooldown <= 0) {
      // Cooldown finished
      clearInterval(cooldownInterval);
      hintBtn.disabled = false;
      hintBtn.style.opacity = '1';
      hintBtn.style.cursor = 'pointer';
      hintBtn.textContent = 'HINT';
    } else {
      // Update button text with countdown
      hintBtn.textContent = `HINT (${remainingCooldown}s)`;
    }
  }, 1000);
}

function showNextButton() {
  nextBtn = createButton('NEXT LEVEL');
  nextBtn.id('nextBtn');
  nextBtn.position(canvasWidth/2 - 75, canvasHeight/2 + 50); // Adjusted Y-position
  nextBtn.mousePressed(() => {
    console.log('Next Level button pressed (mouse)');
    initializeGame(gridSize);
  });
  nextBtn.elt.addEventListener('touchend', (e) => {
    e.preventDefault();
    console.log('Next Level button touched');
    initializeGame(gridSize);
  });
}

function checkWin() {
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (grid[i][j] !== targetPattern[i][j]) return false;
    }
  }
  return true;
}

function draw() {
  if (currentScreen === 'title') {
    drawTitleScreen();
  } else if (currentScreen === 'game') {
    drawGameScreen();
  } else {
    // Don't draw anything if no screen is active
    background(0);
  }
}

function drawTitleScreen() {
  background(0);
  for (let i = 0; i < 20; i++) {
    let x = (frameCount * 0.5 + i * 30) % canvasWidth;
    let y = (frameCount * 0.3 + i * 40) % canvasHeight;
    fill(0, 255, 255, 20 + 10 * sin(frameCount * 0.1 + i));
    noStroke();
    ellipse(x, y, 50, 50);
  }
}

function drawGameScreen() {
  glowIntensity += 0.1 * glowDirection;
  if (glowIntensity > 1 || glowIntensity < 0) glowDirection *= -1;
  background(0);
  const targetGridWidth = gridSize * targetCellSize;
  const targetGridHeight = gridSize * targetCellSize;
  const mainGridWidth = gridSize * cellSize;
  const mainGridHeight = gridSize * cellSize;
  let targetOffsetX = (canvasWidth - targetGridWidth) / 2;
  let targetOffsetY = 40;
  fill(0, 255, 255);
  textSize(18);
  text("TARGET PATTERN", canvasWidth/2, targetOffsetY - 20);
  drawGrid(targetPattern, targetOffsetX, targetOffsetY, targetCellSize, true);
  let offsetX = (canvasWidth - mainGridWidth) / 2;
  let offsetY = targetOffsetY + targetGridHeight + 50;
  drawGrid(grid, offsetX, offsetY, cellSize, false);
  if (hintRequested && hintCell && !gameWon) {
    let glowAlpha = 150 + 100 * sin(frameCount * 0.1);
    fill(255, 255, 0, glowAlpha);
    noStroke();
    rect(hintCell[1] * cellSize + offsetX - 5, hintCell[0] * cellSize + offsetY - 5, cellSize + 10, cellSize + 10, 10);
    let borderAlpha = 200 + 55 * sin(frameCount * 0.2);
    stroke(255, 255, 0, borderAlpha);
    strokeWeight(3);
    noFill();
    rect(hintCell[1] * cellSize + offsetX - 3, hintCell[0] * cellSize + offsetY - 3, cellSize + 6, cellSize + 6, 8);
  }
  if (gameWon) {
    fill(0, 0, 0, 200);
    rect(0, 0, canvasWidth, canvasHeight);
    fill(0, 255, 128);
    textSize(32);
    text("CONGRATULATIONS!", canvasWidth/2, canvasHeight/2 - 30);
    textSize(16);
    text("Level Complete!", canvasWidth/2, canvasHeight/2 + 10);
  }
}

function drawGrid(grid, offsetX, offsetY, cSize, isTarget) {
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (grid[i][j] === 1) {
        let glowColor = isTarget ? color(255, 100, 255) : color(0, 255, 255);
        let glowIntensity = 100 + 50 * sin(frameCount * 0.1 + i + j);
        fill(red(glowColor), green(glowColor), blue(glowColor), glowIntensity * 0.3);
        noStroke();
        rect(j * cSize + offsetX - 3, i * cSize + offsetY - 3, cSize + 6, cSize + 6, 8);
        fill(red(glowColor), green(glowColor), blue(glowColor), glowIntensity * 0.6);
        rect(j * cSize + offsetX - 1, i * cSize + offsetY - 1, cSize + 2, cSize + 2, 6);
        fill(red(glowColor), green(glowColor), blue(glowColor), 255);
        stroke(255, 255, 255, 200);
        strokeWeight(2);
        rect(j * cSize + offsetX, i * cSize + offsetY, cSize, cSize, 5);
      } else {
        fill(0, 0, 0, 100);
        stroke(255, 255, 255, 200);
        strokeWeight(2);
        rect(j * cSize + offsetX, i * cSize + offsetY, cSize, cSize, 5);
      }
    }
  }
}

function updateAdTimer() {
  if (!adPlaying) return;
  adProgress = millis() - adStartTime;
  const remainingTime = Math.ceil((adDuration - adProgress) / 1000);
  const progressPercent = (adProgress / adDuration) * 100;
  const timerFill = document.getElementById('timerFill');
  const timerText = document.getElementById('timerText');
  if (timerFill && timerText) {
    timerFill.style.width = progressPercent + '%';
    timerText.textContent = `Please wait: ${remainingTime} seconds`;
  }
  if (adProgress >= adDuration) {
    completeAdAndGiveHint();
  } else {
    requestAnimationFrame(updateAdTimer);
  }
}

function completeAdAndGiveHint() {
  adPlaying = false;
  
  const adContainer = document.getElementById('adContainer');
  adContainer.classList.remove('visible');
  adContainer.classList.add('hidden');
  
  // Update last hint time for cooldown
  lastHintTime = Date.now();
  
  // Show hint indicator instead of automatically clicking
  hintRequested = true;
  if (solutionPath.length === 0) computeSolution();
  if (solutionPath.length > 0) {
    hintCell = solutionPath.shift();
  } else {
    hintCell = null;
  }
  
  // Start cooldown timer
  startHintCooldown();
}