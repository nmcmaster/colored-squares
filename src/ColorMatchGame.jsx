import React, { useState, useRef, useEffect, useCallback } from 'react';

const ColorMatchGame = ({ autoStartWatch = false, autoStartLevel = null }) => {
  // Game configuration - targetScore is required to advance
  const LEVELS = [
    { gridSize: 4, threshold: 35, morphSpeed: 0.008, targetScore: 15 },
    { gridSize: 6, threshold: 30, morphSpeed: 0.010, targetScore: 20 },
    { gridSize: 8, threshold: 28, morphSpeed: 0.012, targetScore: 25 },
    { gridSize: 10, threshold: 25, morphSpeed: 0.014, targetScore: 30 },
    { gridSize: 12, threshold: 22, morphSpeed: 0.016, targetScore: 35 },
    { gridSize: 14, threshold: 18, morphSpeed: 0.018, targetScore: 40 },
    { gridSize: 16, threshold: 15, morphSpeed: 0.020, targetScore: 50 },
  ];

  // Dante's Inferno - Circles of Hell scene configuration
  // Each level has 3 scene states based on score progress
  // Each scene can have multiple alternates - one is chosen randomly per playthrough
  const INFERNO_SCENES = [
    {
      circle: 'I',
      name: 'Limbo',
      subtitle: 'The Virtuous Pagans',
      scenes: [
        ['/scenes/circle-1-scene-1.png'],
        ['/scenes/circle-1-scene-2.png'],
        ['/scenes/circle-1-scene-3.png'],
      ],
    },
    {
      circle: 'II',
      name: 'Lust',
      subtitle: 'The Carnal Sinners',
      scenes: [
        ['/scenes/circle-2-scene-1.png'],
        ['/scenes/circle-2-scene-2.png'],
        ['/scenes/circle-2-scene-3.png'],
      ],
    },
    {
      circle: 'III',
      name: 'Gluttony',
      subtitle: 'The Cerberus Guard',
      scenes: [
        ['/scenes/circle-3-scene-1.png'],
        ['/scenes/circle-3-scene-2.png'],
        ['/scenes/circle-3-scene-3.png', '/scenes/circle-3-scene-3-alt.png'],
      ],
    },
    {
      circle: 'IV',
      name: 'Greed',
      subtitle: 'The Hoarders & Spenders',
      scenes: [
        ['/scenes/circle-4-scene-1.png', '/scenes/circle-4-scene-1-alt-1.png', '/scenes/circle-4-scene-1-alt-2.png'],
        ['/scenes/circle-4-scene-2.png', '/scenes/circle-4-scene-2-alt-1.png'],
        ['/scenes/circle-4-scene-3.png', '/scenes/circle-4-sceme-3-alt-1.png', '/scenes/circle-4-sceme-3-alt-2.png', '/scenes/circle-4-sceme-3-alt-3.png', '/scenes/circle-4-sceme-3-alt-4.png'],
      ],
    },
    {
      circle: 'V',
      name: 'Wrath',
      subtitle: 'The River Styx',
      scenes: [
        ['/scenes/circle-5-scene-1.png', '/scenes/circle-5-scene-1-alt-1.png', '/scenes/circle-5-scene-1-alt-2png.png', '/scenes/circle-5-scene-1-alt-3.png'],
        ['/scenes/circle-5-scene-2.png', '/scenes/circle-5-scene-2-alt-1.png', '/scenes/cricle-5-scene-2-alt-2.png', '/scenes/cricle-5-scene-2-alt-3.png'],
        ['/scenes/circle-5-scene-3.png', '/scenes/circle-5-scene-3-alt-1.png', '/scenes/circle-5-scene-3-alt-2.png', '/scenes/circle-5-scene-3-alt-3.png'],
      ],
    },
    {
      circle: 'VI',
      name: 'Heresy',
      subtitle: 'The Flaming Tombs',
      scenes: [
        ['/scenes/circle-6-scene-1.png', '/scenes/circle-6-scene-1-alt-1.png'],
        ['/scenes/circle-6-scene-2.png', '/scenes/circle-6-scene-2-alt-1.png'],
        ['/scenes/circle-6-scene-3.png'],
      ],
    },
    {
      circle: 'VII',
      name: 'Violence',
      subtitle: 'The River of Blood',
      scenes: [
        ['/scenes/circle-7-scene-1.png', '/scenes/circle-7-scene-1-alt-1.png'],
        ['/scenes/circle-7-scene-2.png', '/scenes/circle-7-scene-2-alt-1.png', '/scenes/circle-7-scene-2-alt-2.png', '/scenes/circle-7-scene-2-alt-3.png'],
        ['/scenes/circle-7-scene-3.png', '/scenes/circle-7-scene-3-alt-1.png', '/scenes/circle-7-scene-3-alt-2.png', '/scenes/circle-7-scene-3-alt-3.png', '/scenes/circle-7-scene-3-alt-4.png', '/scenes/circle-7-scene-3-alt-5.png'],
      ],
    },
  ];

  // Randomly select one image variant for each scene in each circle
  const selectRandomScenes = () => {
    return INFERNO_SCENES.map(circle =>
      circle.scenes.map(variants =>
        variants[Math.floor(Math.random() * variants.length)]
      )
    );
  };

  // Get current scene based on level and score progress
  const getCurrentScene = () => {
    const infernoLevel = INFERNO_SCENES[Math.min(level, INFERNO_SCENES.length - 1)];
    const levelScenes = selectedScenes[Math.min(level, selectedScenes.length - 1)] || [];
    const targetScore = LEVELS[level]?.targetScore || 1;
    const progress = score / targetScore;

    let sceneIndex = 0;
    if (progress >= 0.66) sceneIndex = 2;
    else if (progress >= 0.33) sceneIndex = 1;

    // Always use the live sceneIndex based on current progress
    const imageIndex = sceneIndex;

    return {
      ...infernoLevel,
      currentScene: levelScenes[imageIndex] || infernoLevel.scenes[imageIndex]?.[0],
      sceneIndex,
    };
  };

  // Watch mode config - 3x3 grid, slightly generous threshold, 30 second rounds
  const WATCH_CONFIG = { gridSize: 3, threshold: 40, morphSpeed: 0.006 };
  const WATCH_DURATION = 30; // seconds

  const GAME_DURATION = 60; // seconds
  const HUE_WEIGHT = 1.5;
  const SAT_WEIGHT = 1.0;
  const LIGHT_WEIGHT = 1.0;

  // Game state (triggers re-renders)
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'levelComplete', 'gameover'
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0); // Animated score display
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [floatingScores, setFloatingScores] = useState([]);
  const [isWatchMode, setIsWatchMode] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showIntro, setShowIntro] = useState(false); // Dramatic intro overlay
  const [selectedScenes, setSelectedScenes] = useState([]); // Randomly selected scene images per circle
  const [sceneTransition, setSceneTransition] = useState(false); // Shadow transition active
  const [displayedSceneIndex, setDisplayedSceneIndex] = useState(0); // Which scene is actually showing
  const [spawnDirection, setSpawnDirection] = useState(0); // 0=top, 1=right, 2=bottom, 3=left
  const [gridShake, setGridShake] = useState(null); // Direction of grid shake on impact
  const prevSceneIndexRef = useRef(0);

  // Toast messages based on match size - Gothic/Metal themed
  const getMatchToast = (size) => {
    if (size <= 2) return null; // No toast for basic matches
    if (size === 3) return { text: 'WICKED', style: 'normal' };
    if (size === 4) return { text: 'UNHOLY', style: 'good' };
    if (size === 5) return { text: 'CURSED', style: 'great' };
    if (size === 6) return { text: 'DIABOLICAL', style: 'amazing' };
    if (size >= 7) return { text: '☠ BLOOD RITE ☠', style: 'legendary' };
  };

  // Show a toast notification
  const showToast = useCallback((text, style = 'normal', duration = 1500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, text, style }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  // Mutable game state (refs for animation loop)
  const squaresRef = useRef([]);
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const gridRef = useRef(null);
  const matchingSquaresRef = useRef(new Set());
  const invalidSquareRef = useRef(null);
  const hasAutoStartedRef = useRef(false);
  const scoreRef = useRef(0);

  // Get current level config
  const getLevelConfig = useCallback(() => {
    if (isWatchMode) return WATCH_CONFIG;
    return LEVELS[Math.min(level, LEVELS.length - 1)];
  }, [level, isWatchMode]);

  // HSL utilities - Gothic palette
  const GOTHIC_HUES = [
    () => Math.random() * 25,           // Blood reds (0-25)
    () => 335 + Math.random() * 25,     // Crimsons (335-360)
    () => 270 + Math.random() * 40,     // Deathly purples (270-310)
    () => 200 + Math.random() * 40,     // Midnight blues (200-240)
    () => 100 + Math.random() * 40,     // Sickly greens (100-140)
    () => 30 + Math.random() * 20,      // Dried blood oranges (30-50)
  ];

  const randomHSL = () => {
    const hueGenerator = GOTHIC_HUES[Math.floor(Math.random() * GOTHIC_HUES.length)];
    return {
      h: hueGenerator(),
      s: 50 + Math.random() * 40,       // 50-90% saturation (vivid)
      l: 20 + Math.random() * 25,       // 20-45% lightness (dark)
    };
  };

  const hslToString = (hsl) => `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  const lerpHSL = (current, target, t) => {
    // Handle hue wrapping
    let dH = target.h - current.h;
    if (dH > 180) dH -= 360;
    if (dH < -180) dH += 360;

    return {
      h: (current.h + dH * t + 360) % 360,
      s: current.s + (target.s - current.s) * t,
      l: current.l + (target.l - current.l) * t,
    };
  };

  const colorDistance = (c1, c2) => {
    // Hue distance with wrapping
    let dH = Math.abs(c1.h - c2.h);
    if (dH > 180) dH = 360 - dH;

    const dS = Math.abs(c1.s - c2.s);
    const dL = Math.abs(c1.l - c2.l);

    return Math.sqrt(
      HUE_WEIGHT * dH * dH +
      SAT_WEIGHT * dS * dS +
      LIGHT_WEIGHT * dL * dL
    );
  };

  // Initialize grid
  const initializeGrid = useCallback(() => {
    const config = getLevelConfig();
    const size = config.gridSize;
    const squares = [];

    for (let i = 0; i < size * size; i++) {
      squares.push({
        id: i,
        color: randomHSL(),
        target: randomHSL(),
        state: 'active', // 'active', 'matching', 'invalid'
      });
    }

    squaresRef.current = squares;
    matchingSquaresRef.current = new Set();
    invalidSquareRef.current = null;
  }, [getLevelConfig]);

  // Get adjacent indices
  const getAdjacentIndices = useCallback((index) => {
    const config = getLevelConfig();
    const size = config.gridSize;
    const row = Math.floor(index / size);
    const col = index % size;
    const adjacent = [];

    if (row > 0) adjacent.push(index - size); // up
    if (row < size - 1) adjacent.push(index + size); // down
    if (col > 0) adjacent.push(index - 1); // left
    if (col < size - 1) adjacent.push(index + 1); // right

    return adjacent;
  }, [getLevelConfig]);

  // Find all matching connected squares (flood-fill based on color similarity)
  const findMatchingCluster = useCallback((startIndex) => {
    const config = getLevelConfig();
    const squares = squaresRef.current;
    const startSquare = squares[startIndex];

    if (!startSquare || startSquare.state !== 'active') return new Set();

    const cluster = new Set([startIndex]);
    const toCheck = [startIndex];

    while (toCheck.length > 0) {
      const currentIndex = toCheck.pop();
      const currentSquare = squares[currentIndex];
      const adjacent = getAdjacentIndices(currentIndex);

      for (const adjIndex of adjacent) {
        if (cluster.has(adjIndex)) continue; // Already in cluster

        const adjSquare = squares[adjIndex];
        if (adjSquare && adjSquare.state === 'active') {
          // Check if adjacent square matches the current square's color
          const distance = colorDistance(currentSquare.color, adjSquare.color);
          if (distance < config.threshold) {
            cluster.add(adjIndex);
            toCheck.push(adjIndex);
          }
        }
      }
    }

    // Only return cluster if it has at least 2 squares (a valid match)
    return cluster.size >= 2 ? cluster : new Set();
  }, [getLevelConfig, getAdjacentIndices]);

  // Handle square click
  const handleSquareClick = useCallback((index) => {
    if (gameState !== 'playing') return;

    const cluster = findMatchingCluster(index);

    if (cluster.size >= 2) {
      // Valid match - mark all squares in cluster as matching
      const squares = squaresRef.current;
      const clusterArray = Array.from(cluster);

      for (const idx of clusterArray) {
        squares[idx].state = 'matching';
        matchingSquaresRef.current.add(idx);
      }

      // Calculate position for floating score (center of cluster)
      const config = getLevelConfig();
      const gridElement = gridRef.current;
      if (gridElement) {
        const rect = gridElement.getBoundingClientRect();
        const squareSize = rect.width / config.gridSize;

        // Find center of cluster
        let sumX = 0, sumY = 0;
        for (const idx of clusterArray) {
          const row = Math.floor(idx / config.gridSize);
          const col = idx % config.gridSize;
          sumX += col * squareSize + squareSize / 2;
          sumY += row * squareSize + squareSize / 2;
        }
        const x = sumX / clusterArray.length;
        const y = sumY / clusterArray.length;

        const floatId = Date.now();
        const points = clusterArray.length; // Score = number of squares matched
        setFloatingScores(prev => [...prev, { id: floatId, x, y, points }]);
        setTimeout(() => {
          setFloatingScores(prev => prev.filter(f => f.id !== floatId));
        }, 800);
      }

      // Score = number of squares in the cluster
      setScore(prev => prev + clusterArray.length);

      // Show celebration toast for bigger matches
      const matchToast = getMatchToast(clusterArray.length);
      if (matchToast) {
        showToast(matchToast.text, matchToast.style);
      }

      // After match animation, mark as empty (gaps)
      setTimeout(() => {
        const squares = squaresRef.current;
        for (const idx of clusterArray) {
          if (squares[idx]) {
            squares[idx].state = 'empty';
          }
          matchingSquaresRef.current.delete(idx);
        }
      }, 300);

      // After gap pause, new blocks drop in from top and push existing blocks down
      setTimeout(() => {
        const squares = squaresRef.current;
        const config = getLevelConfig();
        const size = config.gridSize;

        // Process each column - blocks always come from top
        for (let col = 0; col < size; col++) {
          // Extract column with original row positions
          const column = [];
          for (let row = 0; row < size; row++) {
            const sq = squares[row * size + col];
            column.push({ ...sq, originalRow: row });
          }

          // Check if this column has any empty cells
          const hasEmpty = column.some(sq => sq.state === 'empty');
          if (!hasEmpty) continue;

          // Separate active blocks from empty (preserving original row info)
          const activeBlocks = column.filter(sq => sq.state === 'active');
          const emptyCount = size - activeBlocks.length;

          // Create new blocks - these slide in from off-screen
          const newBlocks = [];
          for (let i = 0; i < emptyCount; i++) {
            newBlocks.push({
              id: -1,
              color: randomHSL(),
              target: randomHSL(),
              state: 'active',
              slideFrom: 'top',
            });
          }

          // Existing blocks get "pushed" animation
          // Calculate actual displacement for each block
          const pushedBlocks = activeBlocks.map((b, i) => {
            const newRow = emptyCount + i; // Where this block will end up
            const displacement = newRow - b.originalRow; // How many rows it moves down
            return {
              ...b,
              pushedDown: displacement > 0,
              pushDisplacement: displacement, // Number of cells to move
              pushDelay: i,
            };
          });

          // New blocks at top, existing blocks below
          const newColumn = [...newBlocks, ...pushedBlocks];

          // Write back to grid
          for (let row = 0; row < size; row++) {
            const idx = row * size + col;
            newColumn[row].id = idx;
            // Clean up originalRow before storing
            const { originalRow, ...blockData } = newColumn[row];
            squares[idx] = blockData;
          }
        }

        // Trigger grid shake when blocks land
        setTimeout(() => {
          setGridShake('top');
          setTimeout(() => setGridShake(null), 500);
        }, 450);

        // Clear animation flags after animations complete
        setTimeout(() => {
          const squares = squaresRef.current;
          for (const sq of squares) {
            if (sq.slideFrom) delete sq.slideFrom;
            if (sq.pushedDown) delete sq.pushedDown;
            if (sq.pushDisplacement !== undefined) delete sq.pushDisplacement;
            if (sq.pushDelay !== undefined) delete sq.pushDelay;
          }
        }, 1200);

      }, 700); // Delay before blocks smash in
    } else {
      // Invalid tap - shake feedback
      invalidSquareRef.current = index;
      setTimeout(() => {
        invalidSquareRef.current = null;
      }, 300);
    }
  }, [gameState, findMatchingCluster, getLevelConfig]);

  // Game loop
  const gameLoop = useCallback((timestamp) => {
    if (gameState !== 'playing') return;

    const config = getLevelConfig();
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Update colors
    const squares = squaresRef.current;
    const gridElement = gridRef.current;

    if (gridElement) {
      const squareElements = gridElement.children;

      for (let i = 0; i < squares.length; i++) {
        const square = squares[i];
        if (square.state !== 'active') continue;

        // Lerp toward target
        square.color = lerpHSL(square.color, square.target, config.morphSpeed);

        // Check if close to target, pick new target
        if (colorDistance(square.color, square.target) < 5) {
          square.target = randomHSL();
        }

        // Update DOM directly for performance
        if (squareElements[i]) {
          squareElements[i].style.backgroundColor = hslToString(square.color);
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, getLevelConfig]);

  // Keep scoreRef in sync with score state
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  // Detect scene changes and trigger flame transition
  useEffect(() => {
    if (gameState !== 'playing' || isWatchMode) return;

    const targetScore = LEVELS[level]?.targetScore || 1;
    const progress = score / targetScore;
    let currentSceneIndex = 0;
    if (progress >= 0.66) currentSceneIndex = 2;
    else if (progress >= 0.33) currentSceneIndex = 1;

    if (currentSceneIndex > prevSceneIndexRef.current) {
      // Scene advanced - trigger shadow descent
      setSceneTransition(true);
      // Swap image midway through transition while obscured by shadow
      setTimeout(() => setDisplayedSceneIndex(currentSceneIndex), 2000);
      // End transition
      setTimeout(() => setSceneTransition(false), 5000);
    }
    prevSceneIndexRef.current = currentSceneIndex;
  }, [score, level, gameState, isWatchMode]);

  // Animate displayScore to match actual score (casino-style rolling)
  useEffect(() => {
    if (displayScore === score) return;

    const diff = score - displayScore;
    // Faster tick for bigger combos, but cap at reasonable speed
    const tickSpeed = Math.max(30, 150 - diff * 10);

    const ticker = setInterval(() => {
      setDisplayScore(prev => {
        if (prev < score) return prev + 1;
        clearInterval(ticker);
        return score;
      });
    }, tickSpeed);

    return () => clearInterval(ticker);
  }, [score, displayScore]);

  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    const config = getLevelConfig();
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Check if player met the target score (not for watch mode)
          if (!isWatchMode && config.targetScore && scoreRef.current >= config.targetScore) {
            setGameState('levelComplete');
          } else {
            setGameState('gameover');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, getLevelConfig, isWatchMode]);

  // Animation loop effect
  useEffect(() => {
    if (gameState === 'playing') {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Start game
  const startGame = (selectedLevel = 0, watchMode = false) => {
    setIsWatchMode(watchMode);
    setLevel(selectedLevel);
    setScore(0);
    setDisplayScore(0);
    setTimeLeft(watchMode ? WATCH_DURATION : GAME_DURATION);
    setFloatingScores([]);
    setToasts([]);
    setSelectedScenes(selectRandomScenes()); // Randomly pick scene variants for this playthrough
    prevSceneIndexRef.current = 0; // Reset scene tracking
    setDisplayedSceneIndex(0);
    setSceneTransition(false);
    setSpawnDirection(0); // Reset spawn direction
    setGridShake(null);
    setGameState('playing');

    // Show dramatic intro overlay
    setShowIntro(true);
    setTimeout(() => {
      setShowIntro(false);
    }, 2800); // Total intro duration
  };

  // Auto-start if props are set (guard against StrictMode double-fire)
  useEffect(() => {
    if (hasAutoStartedRef.current) return;

    if (autoStartWatch) {
      hasAutoStartedRef.current = true;
      startGame(0, true);
    } else if (autoStartLevel !== null) {
      hasAutoStartedRef.current = true;
      startGame(autoStartLevel, false);
    }
  }, []);

  // Initialize grid when level changes or game starts
  useEffect(() => {
    if (gameState === 'playing') {
      initializeGrid();
    }
  }, [gameState, level, initializeGrid]);

  // Next level
  const nextLevel = () => {
    if (level < LEVELS.length - 1) {
      setLevel(prev => prev + 1);
      setTimeLeft(GAME_DURATION);
      setGameState('playing');
    }
  };

  const config = getLevelConfig();

  // Render menu
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 woodcut-bg">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Color Match
          </h1>
          <p className="text-gray-300 mb-8 max-w-md mx-auto">
            Tap squares that match in color with their neighbors. The closer the colors, the better!
          </p>
          <div className="space-y-3">
            {/* Watch Mode - prominent at top */}
            <button
              onClick={() => startGame(0, true)}
              className="block w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg transition-all duration-200 font-semibold"
            >
              ⌚ Watch Mode — 3×3 Grid
            </button>

            <div className="text-gray-500 text-sm py-2">— or play standard —</div>

            {LEVELS.slice(0, 5).map((lvl, i) => (
              <button
                key={i}
                onClick={() => startGame(i, false)}
                className="block w-full px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/20"
              >
                Level {i + 1} — {lvl.gridSize}×{lvl.gridSize} Grid
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Render game over - watch mode version
  if (gameState === 'gameover' && isWatchMode) {
    return (
      <div className="min-h-screen min-w-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-2">
        <div className="text-center w-full max-w-[200px]">
          <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-1">
            {score}
          </p>
          <p className="text-gray-400 text-sm mb-4">matches</p>
          <button
            onClick={() => startGame(0, true)}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-lg font-semibold active:scale-95 transition-transform"
          >
            Again
          </button>
          <button
            onClick={() => setGameState('menu')}
            className="w-full py-2 mt-2 text-gray-500 text-sm"
          >
            Menu
          </button>
        </div>
      </div>
    );
  }

  // Render game over - standard version (failed to reach target)
  if (gameState === 'gameover') {
    const targetScore = LEVELS[level]?.targetScore || 0;
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 woodcut-bg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-2 uppercase tracking-wider" style={{ fontFamily: 'Times New Roman, serif', textShadow: '0 0 20px rgba(220,38,38,0.5)' }}>
            Fallen
          </h1>
          <p className="text-6xl font-bold text-red-400 mb-2" style={{ textShadow: '0 0 30px rgba(220,38,38,0.5)' }}>
            {score}
          </p>
          <p className="text-gray-400 mb-2">of {targetScore} required</p>
          <p className="text-gray-500 mb-8 text-sm">The darkness claims another soul...</p>
          <div className="space-y-3">
            <button
              onClick={() => startGame(level, false)}
              className="block w-full px-8 py-3 bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg transition-all duration-200 border border-red-800"
            >
              Rise Again
            </button>
            <button
              onClick={() => setGameState('menu')}
              className="block w-full px-8 py-3 text-gray-500 hover:text-gray-300 transition-colors"
            >
              Retreat to Shadows
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render level complete - player reached target score
  if (gameState === 'levelComplete') {
    const isLastLevel = level >= LEVELS.length - 1;
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 woodcut-bg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-2 uppercase tracking-wider" style={{ fontFamily: 'Times New Roman, serif', textShadow: '0 0 20px rgba(220,38,38,0.7)' }}>
            {isLastLevel ? 'Ascended' : 'Victorious'}
          </h1>
          <p className="text-6xl font-bold text-red-500 mb-2" style={{ textShadow: '0 0 40px rgba(220,38,38,0.6)' }}>
            {score}
          </p>
          <p className="text-gray-400 mb-2">souls claimed</p>
          <p className="text-gray-500 mb-8 text-sm">
            {isLastLevel ? 'You have conquered all realms!' : 'The next circle of hell awaits...'}
          </p>
          <div className="space-y-3">
            {!isLastLevel && (
              <button
                onClick={nextLevel}
                className="block w-full px-8 py-3 bg-red-800/60 hover:bg-red-700/60 text-red-200 rounded-lg transition-all duration-200 border border-red-600"
                style={{ textShadow: '0 0 10px rgba(220,38,38,0.5)' }}
              >
                Descend Deeper →
              </button>
            )}
            <button
              onClick={() => startGame(level, false)}
              className="block w-full px-8 py-3 bg-black/50 hover:bg-black/70 text-gray-300 rounded-lg transition-all duration-200 border border-gray-700"
            >
              Replay This Circle
            </button>
            <button
              onClick={() => setGameState('menu')}
              className="block w-full px-8 py-3 text-gray-500 hover:text-gray-300 transition-colors"
            >
              Return to the Void
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render game - Watch Mode (minimal UI for tiny screens)
  if (isWatchMode) {
    // Don't render until grid is initialized
    if (squaresRef.current.length === 0) {
      return <div className="min-h-screen min-w-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900" />;
    }
    return (
      <div className="min-h-screen min-w-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col items-center justify-center p-1">
        {/* Compact header - score and time only */}
        <div className="w-full max-w-[200px] flex justify-between items-center mb-2 px-1">
          <div className="relative">
            {displayScore < score && (
              <>
                <span className="flame-ember-sm flame-1">🔥</span>
                <span className="flame-ember-sm flame-2">🔥</span>
                <span className="flame-ember-sm flame-3">🔥</span>
              </>
            )}
            <div className={`relative z-10 text-2xl font-bold tabular-nums ${displayScore < score ? 'flame-text' : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400'}`}>
              {displayScore}
            </div>
          </div>
          <div className={`text-lg font-mono text-white ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : ''}`}>
            {timeLeft}s
          </div>
        </div>

        {/* Game Grid - optimized for watch */}
        <div className="relative">
          <div
            ref={gridRef}
            className={`grid gap-1 p-1 bg-black/40 rounded-lg ${gridShake ? `grid-shake-${gridShake}` : ''}`}
            style={{
              gridTemplateColumns: `repeat(${config.gridSize}, 1fr)`,
              width: `min(95vw, 180px)`,
              height: `min(95vw, 180px)`,
            }}
          >
            {squaresRef.current.map((square, index) => (
              <button
                key={square.id}
                onClick={() => handleSquareClick(index)}
                disabled={square.state === 'empty'}
                className={`
                  rounded-md cursor-pointer
                  active:scale-90 transition-transform duration-100
                  ${square.state === 'empty' ? 'opacity-0 pointer-events-none' : ''}
                  ${matchingSquaresRef.current.has(index) ? 'animate-ping opacity-0' : ''}
                  ${invalidSquareRef.current === index ? 'animate-shake' : ''}
                  ${square.slideFrom ? `slide-in-${square.slideFrom}` : ''}
                  ${square.pushedDown ? 'pushed-down' : ''}
                `}
                style={{
                  backgroundColor: square.state === 'empty' ? 'transparent' : hslToString(square.color),
                  aspectRatio: '1',
                  '--push-distance': square.pushDisplacement ? `${-100 * square.pushDisplacement}%` : undefined,
                  animationDelay: square.pushDelay !== undefined ? `${400 + square.pushDelay * 80}ms` : undefined,
                }}
              />
            ))}
          </div>

          {/* Floating scores - smaller for watch */}
          {floatingScores.map(float => (
            <div
              key={float.id}
              className="absolute pointer-events-none text-lg font-bold text-cyan-400 animate-float"
              style={{
                left: float.x,
                top: float.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              +{float.points}
            </div>
          ))}
        </div>

        {/* Toasts - watch mode (centered overlay for visibility) */}
        {toasts.length > 0 && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            {toasts.map(toast => (
              <div
                key={toast.id}
                className={`
                  px-4 py-2 font-bold animate-toast-in uppercase tracking-wider
                  border-2 gothic-toast
                  ${toast.style === 'intro' ? 'bg-black/90 text-red-500 text-base border-red-900' : ''}
                  ${toast.style === 'normal' ? 'bg-black/90 text-red-400 text-lg border-red-800' : ''}
                  ${toast.style === 'good' ? 'bg-black/90 text-red-500 text-lg border-red-700' : ''}
                  ${toast.style === 'great' ? 'bg-black/90 text-red-400 text-xl border-red-600 animate-toast-pulse' : ''}
                  ${toast.style === 'amazing' ? 'bg-red-900/95 text-red-200 text-xl border-red-500 animate-toast-pulse' : ''}
                  ${toast.style === 'legendary' ? 'bg-black text-red-500 text-2xl border-red-600 animate-toast-legendary gothic-legendary' : ''}
                `}
              >
                {toast.text}
              </div>
            ))}
          </div>
        )}

        {/* Dramatic Intro Overlay */}
        {showIntro && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            {/* Strobe flashes - subtle */}
            <div className="absolute inset-0 strobe-flash-subtle" />

            {/* Bounded text box */}
            <div className="relative z-10 intro-box px-6 py-4 border-2 border-red-800 bg-black/95"
                 style={{ boxShadow: '0 0 40px rgba(0,0,0,0.9), 0 0 20px rgba(220,38,38,0.3), inset 0 0 20px rgba(220,38,38,0.1)' }}>
              <div className="text-xl font-bold uppercase tracking-widest text-red-700 intro-title text-center" style={{ fontFamily: 'Times New Roman, serif' }}>
                SEEK THE
              </div>
              <div className="text-3xl font-bold uppercase tracking-widest text-red-500 intro-title-main mt-1 text-center" style={{ fontFamily: 'Times New Roman, serif', textShadow: '0 0 15px rgba(220,38,38,0.8)' }}>
                BLOOD MATCH
              </div>
            </div>
          </div>
        )}

        {/* Custom animations */}
        <style>{`
          /* Intro overlay animations */
          @keyframes strobeFlashSubtle {
            0% { background: transparent; }
            5% { background: rgba(220, 38, 38, 0.15); }
            10% { background: transparent; }
            15% { background: rgba(255, 255, 255, 0.1); }
            20% { background: transparent; }
            100% { background: transparent; }
          }
          .strobe-flash-subtle {
            animation: strobeFlashSubtle 1s ease-out;
          }
          @keyframes introBoxIn {
            0% { opacity: 0; transform: scale(0.8); }
            20% { opacity: 1; transform: scale(1.05); }
            30% { transform: scale(1); }
            85% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.95); }
          }
          .intro-box {
            animation: introBoxIn 2.8s ease-out forwards;
          }
          @keyframes introTitleIn {
            0% { opacity: 0; }
            20% { opacity: 1; }
            85% { opacity: 1; }
            100% { opacity: 0; }
          }
          .intro-title {
            animation: introTitleIn 2.8s ease-out forwards;
          }
          .intro-title-main {
            animation: introTitleIn 2.8s ease-out forwards;
          }
          @keyframes float {
            0% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -100%) scale(1.2);
            }
          }
          .animate-float {
            animation: float 0.5s ease-out forwards;
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-3px); }
            75% { transform: translateX(3px); }
          }
          .animate-shake {
            animation: shake 0.2s ease-in-out;
          }
          @keyframes toastIn {
            0% {
              opacity: 0;
              transform: translateY(-20px) scale(0.8);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .animate-toast-in {
            animation: toastIn 0.3s ease-out forwards;
          }
          @keyframes toastPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .animate-toast-pulse {
            animation: toastIn 0.3s ease-out, toastPulse 0.4s ease-in-out 0.3s infinite;
          }
          @keyframes toastLegendary {
            0%, 100% { transform: scale(1) rotate(-1deg); }
            25% { transform: scale(1.15) rotate(2deg); }
            50% { transform: scale(1.05) rotate(-2deg); }
            75% { transform: scale(1.15) rotate(1deg); }
          }
          .animate-toast-legendary {
            animation: toastIn 0.3s ease-out, toastLegendary 0.4s ease-in-out 0.3s infinite;
          }
          .gothic-toast {
            font-family: 'Times New Roman', serif;
            text-shadow: 0 0 10px rgba(220, 38, 38, 0.5), 0 0 20px rgba(220, 38, 38, 0.3);
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(220, 38, 38, 0.1);
          }
          .gothic-legendary {
            text-shadow: 0 0 10px #dc2626, 0 0 20px #dc2626, 0 0 40px #dc2626;
            box-shadow: 0 0 30px rgba(220, 38, 38, 0.6), inset 0 0 30px rgba(220, 38, 38, 0.2);
          }
          @keyframes flame {
            0%, 100% {
              text-shadow: 0 0 10px #ff4500, 0 0 20px #ff4500, 0 0 30px #ff0000, 0 0 40px #ff0000;
              transform: scale(1);
            }
            25% {
              text-shadow: 0 0 15px #ff6600, 0 0 25px #ff4500, 0 0 35px #ff0000, 0 0 50px #ff0000, 0 -5px 30px #ffff00;
              transform: scale(1.05);
            }
            50% {
              text-shadow: 0 0 10px #ff4500, 0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 60px #cc0000;
              transform: scale(1.02);
            }
            75% {
              text-shadow: 0 0 15px #ff6600, 0 0 30px #ff4500, 0 0 45px #ff0000, 0 -8px 35px #ffff00;
              transform: scale(1.06);
            }
          }
          .flame-text {
            animation: flame 0.15s ease-in-out infinite;
            color: #ff4500 !important;
            background: linear-gradient(to top, #ff0000, #ff4500, #ff6600, #ffcc00);
            -webkit-background-clip: text;
            background-clip: text;
          }
          @keyframes riseAndBurn {
            0% {
              transform: translateY(5px) scale(0.5) rotate(-10deg);
              opacity: 0;
            }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% {
              transform: translateY(-25px) scale(1) rotate(10deg);
              opacity: 0;
            }
          }
          .flame-ember-sm {
            position: absolute;
            font-size: 0.9rem;
            animation: riseAndBurn 0.5s ease-out infinite;
            filter: brightness(1.3);
            top: 0;
          }
          .flame-1 { left: -5px; animation-delay: 0s; }
          .flame-2 { left: 50%; animation-delay: 0.1s; transform: translateX(-50%); }
          .flame-3 { right: -5px; animation-delay: 0.05s; }
        `}</style>
      </div>
    );
  }

  // Render game - Standard Mode
  // Don't render until grid is initialized
  if (squaresRef.current.length === 0) {
    return <div className="min-h-screen bg-black" />;
  }

  const infernoScene = getCurrentScene();

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      {/* Full bleed background image - mobile only, pinned to top */}
      <div className="absolute inset-0 md:hidden bg-black overflow-hidden">
        <img
          src={infernoScene.currentScene}
          alt={`${infernoScene.name} - Scene ${infernoScene.sceneIndex + 1}`}
          className="w-full object-contain object-top"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        {/* Mirrored reflection below */}
        <img
          src={infernoScene.currentScene}
          alt=""
          className="w-full object-contain object-bottom transform scale-y-[-1]"
          style={{ marginTop: '-1px' }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        {/* Shadow descent transition */}
        {sceneTransition && (
          <div className="absolute inset-0 shadow-transition pointer-events-none" />
        )}
      </div>

      {/* Circle info overlay - mobile only, fades in and out */}
      <div className="absolute inset-x-0 top-0 flex flex-col items-center text-center pt-6 px-4 circle-info-fade z-20 md:hidden pointer-events-none">
        <div className="text-white/90 text-4xl font-serif mb-1 text-outline" style={{ fontFamily: 'Times New Roman, serif' }}>
          {infernoScene.circle}
        </div>
        <div className="text-white/80 text-xl font-bold uppercase tracking-widest text-outline" style={{ fontFamily: 'Times New Roman, serif' }}>
          {infernoScene.name}
        </div>
        <div className="text-white/50 text-sm mt-1 italic text-outline-light">
          {infernoScene.subtitle}
        </div>
        <div className="mt-4 flex gap-4 text-lg">
          {['△', '◈', '▽'].map((symbol, i) => (
            <span
              key={i}
              className={`transition-all duration-500 text-outline ${
                i <= infernoScene.sceneIndex
                  ? 'text-white/90 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]'
                  : 'opacity-0'
              }`}
            >
              {symbol}
            </span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-end md:justify-center gap-4 p-4 relative z-10">

        {/* Inferno Illustration - desktop only, right side */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1 max-w-lg order-2">
          <div className="relative w-full aspect-[3/4] bg-black/40 rounded-xl overflow-hidden border border-red-900/50">
            <img
              src={infernoScene.currentScene}
              alt={`${infernoScene.name} - Scene ${infernoScene.sceneIndex + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            {/* Shadow descent transition */}
            {sceneTransition && (
              <div className="absolute inset-0 shadow-transition pointer-events-none" />
            )}
          </div>
        </div>

        {/* Game Grid - bottom on mobile, left side on desktop */}
        <div className="relative flex-shrink-0 flex flex-col items-center md:order-1">
          {/* Score counter - centered above grid */}
          <div className="text-center relative mb-4">
            {displayScore < score && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="flame-ember flame-1">🔥</span>
                  <span className="flame-ember flame-2">🔥</span>
                  <span className="flame-ember flame-3">🔥</span>
                  <span className="flame-ember flame-4">🔥</span>
                  <span className="flame-ember flame-5">🔥</span>
                </div>
                <div className="absolute -inset-4 bg-gradient-to-t from-red-900/50 via-orange-600/30 to-transparent rounded-full blur-xl animate-pulse pointer-events-none" />
              </>
            )}
            <div className={`relative z-10 text-4xl font-bold tabular-nums ${displayScore < score ? 'flame-text' : ''} ${score >= config.targetScore ? 'text-red-400' : 'text-red-600'}`} style={{ fontFamily: 'Times New Roman, serif', textShadow: score >= config.targetScore ? '0 0 20px rgba(220,38,38,0.7)' : 'none' }}>
              {displayScore}<span className="text-xl text-gray-500">/{config.targetScore}</span>
            </div>
          </div>
          <div
            ref={gridRef}
            className={`grid gap-1 p-2 ${gridShake ? `grid-shake-${gridShake}` : ''}`}
            style={{
              gridTemplateColumns: `repeat(${config.gridSize}, 1fr)`,
              width: `min(90vw, 400px)`,
              height: `min(90vw, 400px)`,
            }}
          >
            {squaresRef.current.map((square, index) => (
              <button
                key={square.id}
                onClick={() => handleSquareClick(index)}
                disabled={square.state === 'empty'}
                className={`
                  rounded-md cursor-pointer
                  hover:scale-105 hover:z-10 transition-transform duration-150
                  ${square.state === 'empty' ? 'opacity-0 pointer-events-none' : ''}
                  ${matchingSquaresRef.current.has(index) ? 'animate-ping opacity-0' : ''}
                  ${invalidSquareRef.current === index ? 'animate-shake' : ''}
                  ${square.slideFrom ? `slide-in-${square.slideFrom}` : ''}
                  ${square.pushedDown ? 'pushed-down' : ''}
                `}
                style={{
                  backgroundColor: square.state === 'empty' ? 'transparent' : hslToString(square.color),
                  aspectRatio: '1',
                  '--push-distance': square.pushDisplacement ? `${-100 * square.pushDisplacement}%` : undefined,
                  animationDelay: square.pushDelay !== undefined ? `${400 + square.pushDelay * 80}ms` : undefined,
                }}
              />
            ))}
          </div>

          {/* Floating scores */}
          {floatingScores.map(float => (
            <div
              key={float.id}
              className="absolute pointer-events-none text-2xl font-bold text-yellow-400 animate-float"
              style={{
                left: float.x,
                top: float.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              +{float.points}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar - timer and pause */}
      <div className="p-4 flex justify-between items-center">
        <button
          onClick={() => setGameState('menu')}
          className="px-6 py-2 text-gray-500 hover:text-red-400 transition-colors text-sm"
        >
          ← Abandon Hope
        </button>
        <div className={`text-xl font-mono ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Dramatic Intro Overlay */}
      {showIntro && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          {/* Strobe flashes - more subtle */}
          <div className="absolute inset-0 strobe-flash-subtle" />

          {/* Bounded text box */}
          <div className="relative z-10 intro-box px-8 py-6 md:px-12 md:py-8 border-2 border-red-800 bg-black/95"
               style={{ boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 30px rgba(220,38,38,0.3), inset 0 0 30px rgba(220,38,38,0.1)' }}>
            <div className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-red-700 intro-title text-center" style={{ fontFamily: 'Times New Roman, serif' }}>
              SEEK THE
            </div>
            <div className="text-4xl md:text-6xl font-bold uppercase tracking-widest text-red-500 intro-title-main mt-1 text-center" style={{ fontFamily: 'Times New Roman, serif', textShadow: '0 0 20px rgba(220,38,38,0.8), 0 0 40px rgba(220,38,38,0.5)' }}>
              BLOOD MATCH
            </div>
          </div>
        </div>
      )}

      {/* Toasts - Gothic style */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 pointer-events-none px-4">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              px-4 py-2 md:px-6 md:py-3 font-bold animate-toast-in uppercase tracking-wider md:tracking-widest
              border-2 gothic-toast whitespace-nowrap
              ${toast.style === 'intro' ? 'bg-black/95 text-red-500 text-base md:text-lg border-red-900' : ''}
              ${toast.style === 'normal' ? 'bg-black/95 text-red-400 text-lg md:text-xl border-red-800' : ''}
              ${toast.style === 'good' ? 'bg-black/95 text-red-500 text-xl md:text-2xl border-red-700' : ''}
              ${toast.style === 'great' ? 'bg-black/95 text-red-400 text-xl md:text-2xl border-red-600 animate-toast-pulse' : ''}
              ${toast.style === 'amazing' ? 'bg-red-950/95 text-red-300 text-2xl md:text-3xl border-red-500 animate-toast-pulse' : ''}
              ${toast.style === 'legendary' ? 'bg-black text-red-500 text-3xl md:text-4xl border-red-600 animate-toast-legendary gothic-legendary' : ''}
            `}
          >
            {toast.text}
          </div>
        ))}
      </div>

      {/* Custom animations */}
      <style>{`
        /* Intro overlay animations */
        @keyframes introFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes introFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .intro-overlay {
          animation: introFadeIn 0.1s ease-out, introFadeOut 0.5s ease-out 2.3s forwards;
        }
        @keyframes strobeFlash {
          0% { background: transparent; }
          5% { background: rgba(255, 50, 50, 0.9); }
          10% { background: transparent; }
          15% { background: rgba(255, 255, 255, 0.95); }
          20% { background: transparent; }
          50% { background: transparent; }
          55% { background: rgba(255, 50, 50, 0.8); }
          60% { background: transparent; }
          65% { background: rgba(255, 255, 255, 0.9); }
          70% { background: transparent; }
          100% { background: transparent; }
        }
        .strobe-flash {
          animation: strobeFlash 1.6s ease-out;
        }
        @keyframes introTitleIn {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0; transform: scale(0.5); }
          70% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes introTitleMainIn {
          0% { opacity: 0; transform: scale(0.3) translateY(20px); letter-spacing: 0.5em; }
          60% { opacity: 0; transform: scale(0.3) translateY(20px); letter-spacing: 0.5em; }
          80% { opacity: 1; transform: scale(1.3) translateY(0); letter-spacing: 0.3em; }
          100% { opacity: 1; transform: scale(1) translateY(0); letter-spacing: 0.25em; }
        }
        .intro-title {
          animation: introTitleIn 1.2s ease-out forwards;
        }
        .intro-title-main {
          animation: introTitleMainIn 1.4s ease-out forwards;
        }
        @keyframes vignetteIn {
          0% { box-shadow: inset 0 0 0 0 rgba(0,0,0,0); }
          100% { box-shadow: inset 0 0 200px 80px rgba(0,0,0,0.9); }
        }
        .intro-vignette {
          animation: vignetteIn 1s ease-out forwards;
        }
        @keyframes float {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(1.5);
          }
        }
        .animate-float {
          animation: float 0.8s ease-out forwards;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes toastIn {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-toast-in {
          animation: toastIn 0.3s ease-out forwards;
        }
        @keyframes toastPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .animate-toast-pulse {
          animation: toastIn 0.3s ease-out, toastPulse 0.4s ease-in-out 0.3s infinite;
        }
        @keyframes toastLegendary {
          0%, 100% { transform: scale(1) rotate(-2deg); }
          25% { transform: scale(1.2) rotate(3deg); }
          50% { transform: scale(1.1) rotate(-3deg); }
          75% { transform: scale(1.2) rotate(2deg); }
        }
        .animate-toast-legendary {
          animation: toastIn 0.3s ease-out, toastLegendary 0.4s ease-in-out 0.3s infinite;
        }
        .gothic-toast {
          font-family: 'Times New Roman', serif;
          text-shadow: 0 0 10px rgba(220, 38, 38, 0.5), 0 0 20px rgba(220, 38, 38, 0.3);
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.9), inset 0 0 30px rgba(220, 38, 38, 0.1);
        }
        .gothic-legendary {
          text-shadow: 0 0 15px #dc2626, 0 0 30px #dc2626, 0 0 60px #dc2626;
          box-shadow: 0 0 40px rgba(220, 38, 38, 0.7), inset 0 0 40px rgba(220, 38, 38, 0.2);
        }
        @keyframes flame {
          0%, 100% {
            text-shadow: 0 0 10px #ff4500, 0 0 20px #ff4500, 0 0 30px #ff0000, 0 0 40px #ff0000;
            transform: scale(1);
          }
          25% {
            text-shadow: 0 0 20px #ff6600, 0 0 30px #ff4500, 0 0 40px #ff0000, 0 0 60px #ff0000, 0 -8px 40px #ffff00;
            transform: scale(1.08);
          }
          50% {
            text-shadow: 0 0 15px #ff4500, 0 0 25px #ff0000, 0 0 50px #ff0000, 0 0 70px #cc0000;
            transform: scale(1.04);
          }
          75% {
            text-shadow: 0 0 20px #ff6600, 0 0 35px #ff4500, 0 0 55px #ff0000, 0 -10px 45px #ffff00;
            transform: scale(1.1);
          }
        }
        .flame-text {
          animation: flame 0.12s ease-in-out infinite;
          color: #ff4500 !important;
          background: linear-gradient(to top, #ff0000, #ff4500, #ff6600, #ffcc00);
          -webkit-background-clip: text;
          background-clip: text;
        }
        @keyframes riseAndBurn {
          0% {
            transform: translateY(10px) scale(0.5) rotate(-10deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translateY(-40px) scale(1.2) rotate(10deg);
            opacity: 0;
          }
        }
        .flame-ember {
          position: absolute;
          font-size: 1.5rem;
          animation: riseAndBurn 0.6s ease-out infinite;
          filter: brightness(1.3);
        }
        .flame-1 { left: 10%; animation-delay: 0s; }
        .flame-2 { left: 30%; animation-delay: 0.1s; }
        .flame-3 { left: 50%; animation-delay: 0.05s; transform: translateX(-50%); }
        .flame-4 { left: 70%; animation-delay: 0.15s; }
        .flame-5 { left: 90%; animation-delay: 0.08s; }
      `}</style>
    </div>
  );
};

export default ColorMatchGame;
