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

function setup() {
  // Create responsive canvas that fits in viewport
  updateCanvasSize();
  
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvasContainer');
  
  textAlign(CENTER, CENTER);
  textSize(20);

  // Setup event listeners
  setupEventListeners();
  
  // Initialize with default grid size
  gridSize = parseInt(document.getElementById('gridSizeSelect').value);
}

function updateCanvasSize() {
  // Get container dimensions
  const container = document.getElementById('canvasContainer');
  const containerRect = container.getBoundingClientRect();
  
  // Calculate available space with padding
  const maxWidth = Math.min(window.innerWidth - 40, 800);
  const maxHeight = Math.min(window.innerHeight - 200, 1000); // Account for controls and padding
  
  // Maintain aspect ratio (3:4 for better mobile experience)
  const aspectRatio = 3 / 4;
  
  if (maxWidth / maxHeight > aspectRatio) {
    canvasWidth = maxHeight * aspectRatio;
    canvasHeight = maxHeight;
  } else {
    canvasWidth = maxWidth;
    canvasHeight = maxWidth / aspectRatio;
  }
  
  // Ensure minimum sizes
  canvasWidth = Math.max(canvasWidth, 300);
  canvasHeight = Math.max(canvasHeight, 400);
  
  // Ensure maximum sizes
  canvasWidth = Math.min(canvasWidth, 800);
  canvasHeight = Math.min(canvasHeight, 1000);
}

function setupEventListeners() {
  // Title screen events
  const playBtn = document.getElementById('playBtn');
  playBtn.addEventListener('click', () => {
    gridSize = parseInt(document.getElementById('gridSizeSelect').value);
    showGameScreen();
    initializeGame(gridSize);
  });
  
  // Add touch event for play button
  playBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    gridSize = parseInt(document.getElementById('gridSizeSelect').value);
    showGameScreen();
    initializeGame(gridSize);
  });

  // Handle dropdown changes
  const gridSizeSelect = document.getElementById('gridSizeSelect');
  
  // Handle change event
  gridSizeSelect.addEventListener('change', () => {
    gridSize = parseInt(gridSizeSelect.value);
  });
  
  // Handle click event
  gridSizeSelect.addEventListener('click', (e) => {
    gridSize = parseInt(gridSizeSelect.value);
  });
  
  // Handle touch events for mobile
  gridSizeSelect.addEventListener('touchstart', (e) => {
    // Don't prevent default - let the native dropdown handle it
    gridSize = parseInt(gridSizeSelect.value);
  }, { passive: true });
  
  gridSizeSelect.addEventListener('touchend', (e) => {
    // Don't prevent default - let the native dropdown handle it
    gridSize = parseInt(gridSizeSelect.value);
  }, { passive: true });
  
  // Handle focus events
  gridSizeSelect.addEventListener('focus', () => {
    gridSize = parseInt(gridSizeSelect.value);
  });
  
  // Handle input events
  gridSizeSelect.addEventListener('input', () => {
    gridSize = parseInt(gridSizeSelect.value);
  });
  
  // Game screen events
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
    if (!adPlaying) {
      initializeGame(gridSize);
    }
  });
  newGameBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!adPlaying) {
      initializeGame(gridSize);
    }
  });
  
  const resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', () => {
    if (!adPlaying) {
      resetGame();
    }
  });
  resetBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!adPlaying) {
      resetGame();
    }
  });

  // Handle window resize
  window.addEventListener('resize', handleResize);
  
  // Enhanced touch handling for canvas only
  const canvasContainer = document.getElementById('canvasContainer');
  
  canvasContainer.addEventListener('touchstart', function(e) {
    if (currentScreen === 'game' && !gameWon && !adPlaying) {
      // Don't prevent default - let the touch complete
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
      // Only prevent scrolling, not the touch
      e.preventDefault();
    }
  }, { passive: false });
  
  canvasContainer.addEventListener('touchend', function(e) {
    if (currentScreen === 'game' && !gameWon && !adPlaying && isTouching) {
      // Don't prevent default - let the touch complete
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartX);
      const deltaY = Math.abs(touch.clientY - touchStartY);
      
      // Only trigger if it's a tap (not a swipe)
      if (deltaX < 10 && deltaY < 10) {
        handleCanvasClick(touch.clientX, touch.clientY);
      }
      isTouching = false;
    }
  }, { passive: true });
  
  // Prevent scrolling on the body but allow button interactions
  document.addEventListener('touchmove', function(e) {
    // Only prevent scrolling on the canvas container
    if (e.target.closest('#canvasContainer')) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Prevent context menu on long press for canvas only
  canvasContainer.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
}

function handleCanvasClick(clientX, clientY) {
  if (currentScreen !== 'game' || gameWon) return;
  
  // Get canvas position relative to viewport
  const canvasRect = canvas.elt.getBoundingClientRect();
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;
  
  // Convert to canvas coordinates
  const x = (canvasX / canvasRect.width) * canvasWidth;
  const y = (canvasY / canvasRect.height) * canvasHeight;
  
  // Handle the click
  handleGridClick(x, y);
}

function handleGridClick(x, y) {
  // Use the same positioning calculations as drawGameScreen
  const targetGridWidth = gridSize * targetCellSize;
  const targetGridHeight = gridSize * targetCellSize;
  const mainGridWidth = gridSize * cellSize;
  const mainGridHeight = gridSize * cellSize;
  
  // Calculate grid positions exactly like drawGameScreen
  const targetOffsetX = (canvasWidth - targetGridWidth) / 2;
  const targetOffsetY = 20;
  
  const mainGridX = (canvasWidth - mainGridWidth) / 2;
  const mainGridY = targetOffsetY + targetGridHeight + 25;
  
  // Check if click is in main grid (play area)
  if (x >= mainGridX && x <= mainGridX + mainGridWidth &&
      y >= mainGridY && y <= mainGridY + mainGridHeight) {
    
    const i = Math.floor((y - mainGridY) / cellSize);
    const j = Math.floor((x - mainGridX) / cellSize);
    
    if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
      // Check if this is the hinted tile
      if (hintRequested && hintCell && hintCell[0] === i && hintCell[1] === j) {
        // Player clicked the hinted tile, remove the hint
        hintRequested = false;
        hintCell = null;
      }
      
      // Toggle the clicked cell and its adjacent cells
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
  // Update canvas size on window resize
  updateCanvasSize();
  resizeCanvas(canvasWidth, canvasHeight);
  
  // Recalculate cell sizes for responsive design
  if (currentScreen === 'game') {
    calculateCellSizes();
  }
}

function calculateCellSizes() {
  // Calculate responsive cell sizes based on canvas and grid size
  // Use more space for grids - increased from 80% to 90% of canvas height
  const availableHeight = canvasHeight * 0.9; // 90% of canvas height for grids
  const availableWidth = canvasWidth * 0.98; // 98% of canvas width
  
  // Calculate space needed for two grids with labels
  const gridSpacing = 25; // Reduced spacing between grids from 40 to 25
  const labelHeight = 20; // Reduced label height from 25 to 20
  const totalGridHeight = availableHeight - gridSpacing - (labelHeight * 2);
  
  // Allocate more space to play area grid (70%) and less to target grid (30%)
  const targetGridHeight = totalGridHeight * 0.3; // 30% for target pattern
  const playGridHeight = totalGridHeight * 0.7; // 70% for play area
  const maxGridWidth = availableWidth;
  
  // Calculate cell sizes for each grid separately
  const maxTargetCellSizeByWidth = maxGridWidth / gridSize;
  const maxTargetCellSizeByHeight = targetGridHeight / gridSize;
  targetCellSize = Math.min(maxTargetCellSizeByWidth, maxTargetCellSizeByHeight);
  
  const maxPlayCellSizeByWidth = maxGridWidth / gridSize;
  const maxPlayCellSizeByHeight = playGridHeight / gridSize;
  cellSize = Math.min(maxPlayCellSizeByWidth, maxPlayCellSizeByHeight);
  
  // Ensure minimum cell sizes for playability - increased minimums for better visibility
  const minCellSize = Math.max(25, Math.min(40, window.innerWidth / 15)); // Increased minimum size
  cellSize = Math.max(cellSize, minCellSize);
  targetCellSize = Math.max(targetCellSize, minCellSize * 0.6); // Reduced target cell size minimum
  
  // Keep target cells significantly smaller than main cells
  targetCellSize = Math.min(targetCellSize, cellSize * 0.7); // Reduced from 0.95 to 0.7
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
  
  // Use the new responsive grid positioning
  const gridSpacing = 40;
  const labelHeight = 25;
  const gridWidth = cellSize * gridSize;
  const gridHeight = cellSize * gridSize;
  
  // Main grid position
  const mainGridX = (canvasWidth - gridWidth) / 2;
  const mainGridY = labelHeight + 10;
  
  // Check if click is in main grid
  if (mouseX >= mainGridX && mouseX <= mainGridX + gridWidth &&
      mouseY >= mainGridY && mouseY <= mainGridY + gridHeight) {
    
    const i = Math.floor((mouseY - mainGridY) / cellSize);
    const j = Math.floor((mouseX - mainGridX) / cellSize);
    
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
}

function getHint() {
  if (currentScreen !== 'game' || gameWon || adPlaying) return;
  
  // Start the ad
  adPlaying = true;
  adStartTime = millis();
  adProgress = 0;
  
  // Show the ad container
  const adContainer = document.getElementById('adContainer');
  adContainer.classList.remove('hidden');
  adContainer.classList.add('visible');
  
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
  let targetOffsetY = 40; // Increased from 20 to 40 to add more top padding
  
  // Target pattern label
  fill(0, 255, 255);
  textSize(18); // Slightly larger text
  text("TARGET PATTERN", canvasWidth/2, targetOffsetY - 20); // Increased from -10 to -20 for more top padding
  
  drawGrid(targetPattern, targetOffsetX, targetOffsetY, targetCellSize, true);
  
  // Draw main grid (bottom grid) - positioned with increased spacing
  let offsetX = (canvasWidth - mainGridWidth) / 2;
  let offsetY = targetOffsetY + targetGridHeight + 50; // Increased spacing from 25 to 50
  
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
        stroke(255, 255, 255, 200); // White gridlines with higher opacity
        strokeWeight(2); // Increased gridline width
        rect(j * cSize + offsetX, i * cSize + offsetY, cSize, cSize, 5);
      } else {
        // Empty cells with white gridlines
        fill(0, 0, 0, 100);
        stroke(255, 255, 255, 200); // White gridlines with higher opacity
        strokeWeight(2); // Increased gridline width
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
  adContainer.classList.remove('visible');
  adContainer.classList.add('hidden');
  
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