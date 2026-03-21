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

      // After animation, replace all squares in cluster
      setTimeout(() => {
        const squares = squaresRef.current;
        for (const idx of clusterArray) {
          if (squares[idx]) {
            squares[idx] = {
              id: idx,
              color: randomHSL(),
              target: randomHSL(),
              state: 'active',
            };
          }
          matchingSquaresRef.current.delete(idx);
        }
      }, 300);
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
    setGameState('playing');

    // Show intro toast
    setTimeout(() => {
      showToast('SEEK THE BLOOD MATCH', 'intro', 2500);
    }, 300);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-4">
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
    return (
      <div className="min-h-screen min-w-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col items-center justify-center p-1">
        {/* Compact header - score and time only */}
        <div className="w-full max-w-[200px] flex justify-between items-center mb-2 px-1">
          <div className="text-2xl font-bold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            {displayScore}
          </div>
          <div className={`text-lg font-mono text-white ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : ''}`}>
            {timeLeft}s
          </div>
        </div>

        {/* Game Grid - optimized for watch */}
        <div className="relative">
          <div
            ref={gridRef}
            className="grid gap-1 p-1 bg-black/40 rounded-lg"
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
                className={`
                  rounded-md transition-all duration-100 cursor-pointer
                  active:scale-90
                  ${matchingSquaresRef.current.has(index) ? 'animate-ping opacity-0' : ''}
                  ${invalidSquareRef.current === index ? 'animate-shake' : ''}
                `}
                style={{
                  backgroundColor: hslToString(square.color),
                  aspectRatio: '1',
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

        {/* Custom animations */}
        <style>{`
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
        `}</style>
      </div>
    );
  }

  // Render game - Standard Mode
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-lg flex justify-between items-center mb-4 text-white">
        <div className="text-lg">
          <span className="text-gray-400">Circle</span>{' '}
          <span className="font-bold">{level + 1}</span>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold tabular-nums ${score >= config.targetScore ? 'text-red-400' : 'text-red-600'}`} style={{ textShadow: score >= config.targetScore ? '0 0 20px rgba(220,38,38,0.7)' : 'none' }}>
            {displayScore}<span className="text-lg text-gray-500">/{config.targetScore}</span>
          </div>
        </div>
        <div className="text-lg">
          <span className={`font-mono ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : ''}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Game Grid */}
      <div className="relative">
        <div
          ref={gridRef}
          className="grid gap-1 p-2 bg-black/30 rounded-xl backdrop-blur-sm"
          style={{
            gridTemplateColumns: `repeat(${config.gridSize}, 1fr)`,
            width: `min(90vw, 500px)`,
            height: `min(90vw, 500px)`,
          }}
        >
          {squaresRef.current.map((square, index) => (
            <button
              key={square.id}
              onClick={() => handleSquareClick(index)}
              className={`
                rounded-md transition-all duration-150 cursor-pointer
                hover:scale-105 hover:z-10
                ${matchingSquaresRef.current.has(index) ? 'animate-ping opacity-0' : ''}
                ${invalidSquareRef.current === index ? 'animate-shake' : ''}
              `}
              style={{
                backgroundColor: hslToString(square.color),
                aspectRatio: '1',
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

      {/* Pause button */}
      <button
        onClick={() => setGameState('menu')}
        className="mt-4 px-6 py-2 text-gray-400 hover:text-white transition-colors"
      >
        ← Menu
      </button>

      {/* Toasts - Gothic style */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              px-6 py-3 font-bold animate-toast-in uppercase tracking-widest
              border-2 gothic-toast
              ${toast.style === 'intro' ? 'bg-black/95 text-red-500 text-lg border-red-900' : ''}
              ${toast.style === 'normal' ? 'bg-black/95 text-red-400 text-xl border-red-800' : ''}
              ${toast.style === 'good' ? 'bg-black/95 text-red-500 text-2xl border-red-700' : ''}
              ${toast.style === 'great' ? 'bg-black/95 text-red-400 text-2xl border-red-600 animate-toast-pulse' : ''}
              ${toast.style === 'amazing' ? 'bg-red-950/95 text-red-300 text-3xl border-red-500 animate-toast-pulse' : ''}
              ${toast.style === 'legendary' ? 'bg-black text-red-500 text-4xl border-red-600 animate-toast-legendary gothic-legendary' : ''}
            `}
          >
            {toast.text}
          </div>
        ))}
      </div>

      {/* Custom animations */}
      <style>{`
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
      `}</style>
    </div>
  );
};

export default ColorMatchGame;
