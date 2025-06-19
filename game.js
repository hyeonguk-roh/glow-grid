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

function setup() {
  // Create responsive canvas that fits in viewport
  canvasWidth = Math.min(windowWidth - 4, 600);
  canvasHeight = Math.min(windowHeight - 4, 800);
  
  // Ensure canvas maintains aspect ratio
  const aspectRatio = 600 / 800; // 3:4 aspect ratio
  if (canvasWidth / canvasHeight > aspectRatio) {
    canvasWidth = canvasHeight * aspectRatio;
  } else {
    canvasHeight = canvasWidth / aspectRatio;
  }
  
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvasContainer');
  
  textAlign(CENTER, CENTER);
  textSize(20);

  // Setup event listeners
  setupEventListeners();
  
  // Initialize with default grid size
  gridSize = parseInt(document.getElementById('gridSizeSelect').value);
}

function setupEventListeners() {
  // Title screen events
  document.getElementById('playBtn').addEventListener('click', () => {
    gridSize = parseInt(document.getElementById('gridSizeSelect').value);
    showGameScreen();
    initializeGame(gridSize);
  });

  // Game screen events
  document.getElementById('backBtn').addEventListener('click', showTitleScreen);
  document.getElementById('hintBtn').addEventListener('click', getHint);
  document.getElementById('newGameBtn').addEventListener('click', () => {
    if (!adPlaying) {
      initializeGame(gridSize);
    }
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!adPlaying) {
      resetGame();
    }
  });

  // Handle window resize
  window.addEventListener('resize', handleResize);
  
  // Prevent scrolling on mobile
  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
  }, { passive: false });
  
  document.addEventListener('wheel', function(e) {
    e.preventDefault();
  }, { passive: false });
}

function handleResize() {
  // Update canvas size on window resize
  canvasWidth = Math.min(windowWidth - 4, 600);
  canvasHeight = Math.min(windowHeight - 4, 800);
  
  // Ensure canvas maintains aspect ratio
  const aspectRatio = 600 / 800; // 3:4 aspect ratio
  if (canvasWidth / canvasHeight > aspectRatio) {
    canvasWidth = canvasHeight * aspectRatio;
  } else {
    canvasHeight = canvasWidth / aspectRatio;
  }
  
  resizeCanvas(canvasWidth, canvasHeight);
  
  // Recalculate cell sizes for responsive design
  if (currentScreen === 'game') {
    calculateCellSizes();
  }
}

function calculateCellSizes() {
  // Calculate responsive cell sizes based on canvas and grid size
  // Allocate more space for grids - increased from 60% to 80% of canvas height
  const availableHeight = canvasHeight * 0.8; // 80% of canvas height for grids
  const availableWidth = canvasWidth * 0.95; // 95% of canvas width
  
  // Calculate space needed for two grids with labels
  const gridSpacing = 40; // Reduced spacing between grids
  const labelHeight = 25; // Reduced label height
  const totalGridHeight = availableHeight - gridSpacing - (labelHeight * 2);
  
  // Each grid gets roughly half the available height
  const maxGridHeight = totalGridHeight / 2;
  const maxGridWidth = availableWidth;
  
  // Calculate cell size based on the smaller constraint to maintain square aspect ratio
  const maxCellSizeByWidth = maxGridWidth / gridSize;
  const maxCellSizeByHeight = maxGridHeight / gridSize;
  
  // Use the smaller of the two to maintain square cells
  cellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight);
  
  // Apply the same logic to target cell size
  targetCellSize = Math.min(maxCellSizeByWidth, maxCellSizeByHeight);
  
  // Ensure minimum cell sizes for playability - increased minimums
  cellSize = Math.max(cellSize, 25);
  targetCellSize = Math.max(targetCellSize, 20);
  
  // Keep target cells slightly smaller than main cells
  targetCellSize = Math.min(targetCellSize, cellSize * 0.9);
}

function showTitleScreen() {
  currentScreen = 'title';
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
  grid = createGrid(size, size); // Start with empty grid
  hintRequested = false;
  hintCell = null;
  solutionPath = [];
  computeSolution();
  gameWon = false;
  if (nextBtn) nextBtn.remove();
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
  // Generate random solution vector x
  let x = Array(n).fill(0).map(() => Math.floor(random(2))); // Random 0 or 1
  // Compute b = A * x
  let b = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      b[i] = (b[i] + solutionMatrixA[i][j] * x[j]) % 2;
    }
  }
  // Convert b to target pattern
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
      A[idx][idx] = 1; // Self
      if (i > 0) A[(i-1)*size + j][idx] = 1; // Up
      if (i < size-1) A[(i+1)*size + j][idx] = 1; // Down
      if (j > 0) A[i*size + (j-1)][idx] = 1; // Left
      if (j < size-1) A[i*size + (j+1)][idx] = 1; // Right
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
  if (currentScreen !== 'game' || gameWon || adPlaying) return;
  
  // Calculate grid position based on responsive canvas
  const mainGridWidth = gridSize * cellSize;
  const targetGridHeight = gridSize * targetCellSize;
  
  let offsetX = (canvasWidth - mainGridWidth) / 2;
  let offsetY = 30 + targetGridHeight + 40; // Updated to match new positioning
  
  let i = floor((mouseY - offsetY) / cellSize);
  let j = floor((mouseX - offsetX) / cellSize);
  
  if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
    // Check if this is the hinted tile
    if (hintRequested && hintCell && hintCell[0] === i && hintCell[1] === j) {
      // Player clicked the hinted tile, remove the hint
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

// Handle touch events for mobile
function touchStarted() {
  if (currentScreen !== 'game' || gameWon) return false;
  
  // Prevent default touch behavior
  return false;
}

function touchMoved() {
  return false;
}

function touchEnded() {
  if (currentScreen !== 'game' || gameWon || adPlaying) return false;
  
  // Calculate grid position based on responsive canvas
  const mainGridWidth = gridSize * cellSize;
  const targetGridHeight = gridSize * targetCellSize;
  
  let offsetX = (canvasWidth - mainGridWidth) / 2;
  let offsetY = 30 + targetGridHeight + 40; // Updated to match new positioning
  
  let i = floor((touches[0].y - offsetY) / cellSize);
  let j = floor((touches[0].x - offsetX) / cellSize);
  
  if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
    // Check if this is the hinted tile
    if (hintRequested && hintCell && hintCell[0] === i && hintCell[1] === j) {
      // Player touched the hinted tile, remove the hint
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
  
  return false;
}

function getHint() {
  if (currentScreen !== 'game' || gameWon || adPlaying) return;
  
  // Start the ad
  adPlaying = true;
  adStartTime = millis();
  adProgress = 0;
  
  // Show the ad container
  const adContainer = document.getElementById('adContainer');
  adContainer.style.display = 'flex';
  
  // Load AdSense ad
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.log('AdSense not loaded or configured');
  }
  
  // Start the timer update
  updateAdTimer();
}

function showNextButton() {
  nextBtn = createButton('NEXT LEVEL');
  nextBtn.id('nextBtn');
  nextBtn.position(canvasWidth/2 - 75, canvasHeight/2);
  nextBtn.mousePressed(() => initializeGame(gridSize));
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
  }
}

function drawTitleScreen() {
  background(0);
  
  // Draw animated background pattern
  for (let i = 0; i < 20; i++) {
    let x = (frameCount * 0.5 + i * 30) % canvasWidth;
    let y = (frameCount * 0.3 + i * 40) % canvasHeight;
    fill(0, 255, 255, 20 + 10 * sin(frameCount * 0.1 + i));
    noStroke();
    ellipse(x, y, 50, 50);
  }
}

function drawGameScreen() {
  // Animate glow intensity
  glowIntensity += 0.1 * glowDirection;
  if (glowIntensity > 1 || glowIntensity < 0) {
    glowDirection *= -1;
  }
  
  background(0);
  
  // Calculate grid positions with proper centering
  const targetGridWidth = gridSize * targetCellSize;
  const targetGridHeight = gridSize * targetCellSize;
  const mainGridWidth = gridSize * cellSize;
  const mainGridHeight = gridSize * cellSize;
  
  // Draw target pattern (top grid) - positioned higher to use more space
  let targetOffsetX = (canvasWidth - targetGridWidth) / 2;
  let targetOffsetY = 30; // Reduced from 50 to use more space
  
  // Target pattern label
  fill(0, 255, 255);
  textSize(18); // Slightly larger text
  text("TARGET PATTERN", canvasWidth/2, targetOffsetY - 15);
  
  drawGrid(targetPattern, targetOffsetX, targetOffsetY, targetCellSize, true);
  
  // Draw main grid (bottom grid) - positioned with tighter spacing
  let offsetX = (canvasWidth - mainGridWidth) / 2;
  let offsetY = targetOffsetY + targetGridHeight + 40; // Reduced spacing from 60 to 40
  
  // Main grid label
  fill(0, 255, 255);
  textSize(18); // Slightly larger text
  text("PLAY AREA", canvasWidth/2, offsetY - 15);
  
  drawGrid(grid, offsetX, offsetY, cellSize, false);
  
  // Draw hint glow on the play area grid
  if (hintRequested && hintCell && !gameWon) {
    let glowAlpha = 150 + 100 * sin(frameCount * 0.1);
    fill(255, 255, 0, glowAlpha);
    noStroke();
    rect(hintCell[1] * cellSize + offsetX - 5, hintCell[0] * cellSize + offsetY - 5, cellSize + 10, cellSize + 10, 10);
    
    // Add a pulsing border around the hinted tile
    let borderAlpha = 200 + 55 * sin(frameCount * 0.2);
    stroke(255, 255, 0, borderAlpha);
    strokeWeight(3);
    noFill();
    rect(hintCell[1] * cellSize + offsetX - 3, hintCell[0] * cellSize + offsetY - 3, cellSize + 6, cellSize + 6, 8);
  }

  // Draw win overlay
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
        // Neon glow effect for filled cells
        let glowColor = isTarget ? color(255, 100, 255) : color(0, 255, 255);
        let glowIntensity = 100 + 50 * sin(frameCount * 0.1 + i + j);
        
        // Outer glow
        fill(red(glowColor), green(glowColor), blue(glowColor), glowIntensity * 0.3);
        noStroke();
        rect(j * cSize + offsetX - 3, i * cSize + offsetY - 3, cSize + 6, cSize + 6, 8);
        
        // Inner glow
        fill(red(glowColor), green(glowColor), blue(glowColor), glowIntensity * 0.6);
        rect(j * cSize + offsetX - 1, i * cSize + offsetY - 1, cSize + 2, cSize + 2, 6);
        
        // Core cell
        fill(red(glowColor), green(glowColor), blue(glowColor), 255);
        stroke(255, 255, 255, 100);
        strokeWeight(1);
        rect(j * cSize + offsetX, i * cSize + offsetY, cSize, cSize, 5);
      } else {
        // Empty cells with subtle border
        fill(0, 0, 0, 100);
        stroke(0, 255, 255, 50);
        strokeWeight(1);
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
  
  // Update timer elements
  const timerFill = document.getElementById('timerFill');
  const timerText = document.getElementById('timerText');
  
  if (timerFill && timerText) {
    timerFill.style.width = progressPercent + '%';
    timerText.textContent = `Please wait: ${remainingTime} seconds`;
  }
  
  // Check if ad is complete
  if (adProgress >= adDuration) {
    completeAdAndGiveHint();
  } else {
    // Continue updating timer
    requestAnimationFrame(updateAdTimer);
  }
}

function completeAdAndGiveHint() {
  adPlaying = false;
  
  // Hide the ad container
  const adContainer = document.getElementById('adContainer');
  adContainer.style.display = 'none';
  
  // Show hint indicator instead of automatically clicking
  hintRequested = true;
  if (solutionPath.length === 0) {
    computeSolution();
  }
  if (solutionPath.length > 0) {
    hintCell = solutionPath.shift(); // Get the next move but don't apply it
  } else {
    hintCell = null;
  }
} 