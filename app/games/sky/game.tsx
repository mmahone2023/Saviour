'use client';

import { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { SkyGameCompletionCard } from '@/components/sky-game-completion-card';
import {
  createSkyArrowChallengeState,
  notifySkyArrowFirstRescue,
  skyArrowDisabledMessageIndexForLevel,
  tickSkyArrowChallenge,
  type SkyArrowChallengeState,
} from '@/app/games/sky-arrow-challenge';
import { destroyTaggedRescueNpcs, SKY_RESCUE_NPC_DATA_KEY } from '@/app/games/sky-rescue-single-npc';
import {
  mountSkyFailBubbleMessages,
  SKY_BASE_FAIL_MESSAGES,
  SKY_FAIL_FEEDBACK_MS,
} from '@/app/games/sky-rescue-fail-bubbles';

const SPEECH_BUBBLE_RESCUE_MS = 10000;

const MAX_LEVEL = 5;

// Game Scene
class SkyGameScene extends Phaser.Scene {
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private npc: Phaser.Physics.Arcade.Sprite | null = null;
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private currentLevel: number = 1;
  private hearts: number = 0;
  private helpRadius: number = 100;
  private helpProgress: number = 0;
  private levelComplete: boolean = false;
  private isCarrying: boolean = false;
  private baseVelocity: { x: number; y: number } = { x: 0, y: 0 }; // Store initial velocity
  private npcHasBeenTouched: boolean = false;
  /** Prevents stacking multiple scene.restart timers when the NPC stays below the water line. */
  private drownRestartScheduled: boolean = false;
  /** If set, a delayed fail→restart is pending; must be cleared when the player saves the NPC instead. */
  private drownFailTimer: Phaser.Time.TimerEvent | null = null;
  /** While true (victory clip playing), ignore water-line fail — avoids restart racing the rescue flow. */
  private inVictorySequence: boolean = false;
  private failBubbleLayer: Phaser.GameObjects.Container | null = null;
  /** Bumps on each completeLevel; invalidates stale sound `complete` / `unlocked` callbacks. */
  private victoryAdvanceSeq: number = 0;
  /** Ensures `complete` cannot advance the level twice for the same rescue (same seq). */
  private lastVictoryHandledSeq: number = -999;
  private currentSpeed: number = 50; // Starting speed, increases by 5 each round
  private isPaused: boolean = false;

  private npcList: Array<{
    name: string;
    emotion: string;
    x: number;
    y: number;
    description: string;
  }> = [
    {
      name: '🦅 Bird',
      emotion: 'Broken Wing',
      x: 700,
      y: 150,
      description: 'Save the bird with the broken wing falling into the ocean',
    },
    {
      name: '☁️ Cloud Dragon',
      emotion: 'Lost',
      x: 600,
      y: 120,
      description: 'Guide the cloud dragon back home',
    },
    {
      name: '🪶 Feather Spirit',
      emotion: 'Lonely',
      x: 750,
      y: 100,
      description: 'Comfort the lonely feather spirit',
    },
    {
      name: '🌤️ Storm Child',
      emotion: 'Scared',
      x: 650,
      y: 140,
      description: 'Calm the scared storm child',
    },
    {
      name: '⭐ Little Big Moma',
      emotion: 'Weakened',
      x: 700,
      y: 110,
      description: 'Restore hope and positivity',
    },
  ];

  onHeartEarned: ((hearts: number, level: number) => void) | null = null;
  onGameComplete: (() => void) | null = null;
  onPauseStateChange: ((isPaused: boolean) => void) | null = null;
  onArrowDisabledNudge: ((message: string) => void) | null = null;
  private victorySound: Phaser.Sound.BaseSound | null = null;
  private skyArrowChallenge: SkyArrowChallengeState = createSkyArrowChallengeState();

  constructor() {
    super({ key: 'SkyGameScene' });
  }

  preload() {
    this.load.audio('victory', '/audio/saviour.wav');
  }

  create() {
    // Initialize speed from registry for continuous rounds
    const roundData = this.registry.get('skyGameRound') || { roundNumber: 1, baseSpeed: 80 };
    this.currentSpeed = roundData.baseSpeed;

    this.currentLevel = 1;
    this.hearts = 0;
    this.lastVictoryHandledSeq = -999;
    this.inVictorySequence = false;
    this.drownFailTimer = null;
    this.failBubbleLayer = null;

    // Set scene background color to sky blue
    this.cameras.main.setBackgroundColor(0x87ceeb);

    // Add ocean rectangle for level 1
    if (this.currentLevel === 1) {
      const ocean = this.add.rectangle(400, 450, 800, 300, 0x1e90ff);
      ocean.setDepth(-10);
      
      // Add simple waves 
      for (let i = 0; i < 4; i++) {
        const wave = this.add.rectangle(400, 420 + i * 25, 800, 3, 0x0047ab);
        wave.setDepth(-9);
      }
    }

    // Add some cloud-like obstacles
    this.addClouds();

    // Create player - use simple circle for now
    this.player = this.physics.add.sprite(100, 300, '__DEFAULT');
    this.player.setScale(1.5);
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // Create simple player graphics (person with cape)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    // Cape (blue)
    playerGraphics.fillStyle(0x1e3a8a, 1); // Dark blue cape
    playerGraphics.beginPath();
    playerGraphics.moveTo(20, 8);
    playerGraphics.lineTo(5, 15);
    playerGraphics.lineTo(35, 15);
    playerGraphics.closePath();
    playerGraphics.fillPath();
    // Body (skin tone)
    playerGraphics.fillStyle(0xf4a460, 1); // Sandy brown
    playerGraphics.fillCircle(20, 10, 6);
    // Head
    playerGraphics.fillStyle(0xd2691e, 1); // Brown
    playerGraphics.fillCircle(20, 6, 4);
    // Eyes
    playerGraphics.fillStyle(0x000000, 1); // Black
    playerGraphics.fillCircle(18, 5, 1);
    playerGraphics.fillCircle(22, 5, 1);
    playerGraphics.generateTexture('player', 40, 30);
    playerGraphics.destroy();

    this.player.setTexture('player');

    // Create NPC
    this.createNPC();

    // Particle emitter for healing effect
    this.particles = this.add.particles(0xffff00);
    this.particles.stop();

    // Input
    this.cursors = this.input.keyboard?.createCursorKeys() || null;

    // Add space key for pause
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.togglePause();
    });

    this.victorySound = this.sound.add('victory', { volume: 0.8 });
    this.skyArrowChallenge = createSkyArrowChallengeState();

    // Set up physics
    this.physics.world.setBounds(0, 0, 800, 600);
  }

  addClouds() {
    // Add simple cloud shapes using ellipses
    const clouds = [
      { x: 100, y: 100, scaleX: 1, scaleY: 1 },
      { x: 300, y: 150, scaleX: 1.2, scaleY: 1.2 },
      { x: 600, y: 200, scaleX: 1, scaleY: 1 },
    ];

    clouds.forEach(cloud => {
      const cloudGraphic = this.add.ellipse(cloud.x, cloud.y, 60 * cloud.scaleX, 25 * cloud.scaleY, 0xffffff, 0.5);
      cloudGraphic.setDepth(0);
    });
  }

  private cancelPendingDrownRestart(): void {
    if (this.drownFailTimer) {
      this.time.removeEvent(this.drownFailTimer);
      this.drownFailTimer = null;
    }
    if (this.failBubbleLayer) {
      this.failBubbleLayer.destroy(true);
      this.failBubbleLayer = null;
    }
    this.drownRestartScheduled = false;
  }

  /**
   * Spawns exactly one falling NPC. Any previous sprite is destroyed first.
   * The next drop only runs after the prior rescue finishes (victory audio → nextLevel),
   * so there is never a second character falling while the Saviour is carrying one.
   */
  createNPC() {
    destroyTaggedRescueNpcs(this, this.player);
    if (this.npc) {
      this.npc.destroy();
      this.npc = null;
    }
    this.cancelPendingDrownRestart();

    const npcData = this.npcList[Math.min(MAX_LEVEL, this.currentLevel) - 1];
    const lvl = Math.min(MAX_LEVEL, Math.max(1, this.currentLevel));
    const npcTexKey = `sky_npc_lv_${lvl}`;

    // Get round data to vary spawn position
    const roundData = this.registry.get('skyGameRound') || { roundNumber: 1, baseSpeed: 80 };
    
    // Vary x position based on round: cycles through different x positions
    const xPositions = [150, 400, 650, 250, 550, 100, 700];
    const spawnX = xPositions[(roundData.roundNumber - 1) % xPositions.length];
    
    // Start NPC at top with varied x position
    this.npc = this.physics.add.sprite(spawnX, 50, '__DEFAULT');
    
    // Calculate falling velocity with angle
    // Almost vertical: 5 degrees from vertical, speed is slow
    const angle = 5;
    const angleRad = angle * Math.PI / 180;
    const speed = this.currentSpeed;
    
    // Alternate falling direction (left/right) based on level
    const direction = this.currentLevel % 2 === 1 ? 1 : -1;
    
    const vx = speed * Math.sin(angleRad) * direction;
    const vy = speed * Math.cos(angleRad);
    
    this.npc.setVelocity(vx, vy);
    this.baseVelocity = { x: vx, y: vy };
    this.npc.setCollideWorldBounds(false); // Allow it to fall off screen
    this.npc.setDepth(10);
    this.npc.setData(SKY_RESCUE_NPC_DATA_KEY, true);

    // Create NPC graphics based on level
    const npcGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    
    if (this.currentLevel === 1) {
      // Bird with broken wing (falling)
      npcGraphics.fillStyle(0x8b4513, 1); // Brown bird body
      npcGraphics.fillCircle(15, 15, 7);
      // Head
      npcGraphics.fillStyle(0xa0522d, 1); // Darker brown
      npcGraphics.fillCircle(15, 8, 5);
      // Eye
      npcGraphics.fillStyle(0xffffff, 1); // White
      npcGraphics.fillCircle(17, 7, 1.5);
      npcGraphics.fillStyle(0x000000, 1); 
      npcGraphics.fillCircle(17, 7, 0.8);
      // Beak
      npcGraphics.fillStyle(0xffa500, 1); // Orange
      npcGraphics.fillTriangle(21, 8, 25, 7, 21, 9);
      // One wing (broken - drooping down)
      npcGraphics.lineStyle(2, 0x654321);
      npcGraphics.beginPath();
      npcGraphics.moveTo(8, 15);
      npcGraphics.lineTo(5, 22);
      npcGraphics.stroke();
    } else {
      // Default NPC graphics for other levels
      npcGraphics.fillStyle(0xffd700, 1); // Gold color
      npcGraphics.fillCircle(15, 15, 8);
      npcGraphics.fillStyle(0xffed4e, 1);
      npcGraphics.fillCircle(15, 8, 5);
    }
    
    npcGraphics.generateTexture(npcTexKey, 30, 30);
    npcGraphics.destroy();

    this.npc.setTexture(npcTexKey);

    this.helpProgress = 0;
    this.levelComplete = false;
    this.isCarrying = false;
    this.npcHasBeenTouched = false;
  }

  update() {
    if (!this.player) return;

    const arrowsLocked = tickSkyArrowChallenge(
      this.time.now,
      this.isPaused,
      this.skyArrowChallenge,
      this.cursors,
      skyArrowDisabledMessageIndexForLevel(this.currentLevel),
      (message) => this.onArrowDisabledNudge?.(message),
    );

    if (this.isPaused || (this.levelComplete && !this.isCarrying)) return;

    // Player movement
    const speed = 300;
    this.player.setVelocity(0);

    if (this.isCarrying && this.npc) {
      const flySpeed = 40;
      const flyAngle = -45;
      const flyVx = flySpeed * Math.cos((flyAngle * Math.PI) / 180);
      const flyVy = flySpeed * Math.sin((flyAngle * Math.PI) / 180);

      this.player.setVelocity(flyVx, flyVy);
      this.npc.setPosition(this.player.x, this.player.y - 30);
      this.npc.setVelocity(flyVx, flyVy);
      return;
    }

    if (!arrowsLocked) {
      if (this.cursors?.left.isDown) {
        this.player.setVelocityX(-speed);
      } else if (this.cursors?.right.isDown) {
        this.player.setVelocityX(speed);
      }

      if (this.cursors?.up.isDown) {
        this.player.setVelocityY(-speed);
      } else if (this.cursors?.down.isDown) {
        this.player.setVelocityY(speed);
      }
    }

    if (this.npc) {
      this.npc.setVelocity(this.baseVelocity.x, this.baseVelocity.y);

      // Check if NPC touches water (below 450 pixels)
      if (
        this.npc.y > 450 &&
        !this.npcHasBeenTouched &&
        !this.drownRestartScheduled &&
        !this.inVictorySequence
      ) {
        this.drownRestartScheduled = true;
        if (!this.failBubbleLayer) {
          this.failBubbleLayer = mountSkyFailBubbleMessages(this, SKY_BASE_FAIL_MESSAGES);
        }
        this.drownFailTimer = this.time.delayedCall(SKY_FAIL_FEEDBACK_MS, () => {
          this.drownFailTimer = null;
          if (this.failBubbleLayer) {
            this.failBubbleLayer.destroy(true);
            this.failBubbleLayer = null;
          }
          this.levelComplete = false;
          this.drownRestartScheduled = false;
          this.createNPC();
        });
      }

      // Check distance to player for pickup
      if (this.player) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          this.npc.x,
          this.npc.y
        );

        if (distance < this.helpRadius && !this.npcHasBeenTouched) {
          // Player caught the falling character — cancel fail timer if NPC crossed water line earlier.
          this.cancelPendingDrownRestart();
          this.npcHasBeenTouched = true;
          this.isCarrying = true;

          if (this.onHeartEarned) {
            this.hearts = Math.min(MAX_LEVEL, this.hearts + 1);
            this.onHeartEarned(this.hearts, Math.min(MAX_LEVEL, this.currentLevel));
          }
          if (this.hearts === 1) {
            notifySkyArrowFirstRescue(this.skyArrowChallenge, this.time.now);
          }

          // Emit celebrating particles
          if (this.particles) {
            this.particles.emitParticleAt(this.npc.x, this.npc.y, 10);
          }

          this.completeLevel();
        }
      }
    }
  }

  nextLevel() {
    if (this.currentLevel >= MAX_LEVEL) return;
    this.currentLevel += 1;
    // Carried NPC is destroyed here and replaced by the next single drop (no overlap).
    this.createNPC();
  }

  completeLevel() {
    this.cancelPendingDrownRestart();
    this.levelComplete = true;
    this.inVictorySequence = true;
    const seq = ++this.victoryAdvanceSeq;

    const continueToNextCharacter = () => {
      if (seq !== this.victoryAdvanceSeq) return;
      if (this.lastVictoryHandledSeq === seq) return;
      this.lastVictoryHandledSeq = seq;
      if (this.currentLevel < MAX_LEVEL) {
        this.nextLevel();
      } else if (this.onGameComplete) {
        this.onGameComplete();
      }
      this.inVictorySequence = false;
    };

    if (!this.victorySound) {
      this.victorySound = this.sound.add('victory', { volume: 0.8 });
    }

    // Drop prior listeners first: stop() can emit `complete` on some builds if listeners still attached.
    this.victorySound.off(Phaser.Sound.Events.COMPLETE);
    if (this.victorySound.isPlaying) {
      this.victorySound.stop();
    }

    this.victorySound.once(Phaser.Sound.Events.COMPLETE, () => {
      if (seq !== this.victoryAdvanceSeq) return;
      continueToNextCharacter();
    });

    // Avoid stacking `unlocked` handlers — each rescue added another; all fired at once → multiple play/complete → extra NPCs.
    this.sound.off(Phaser.Sound.Events.UNLOCKED);
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        if (seq !== this.victoryAdvanceSeq) return;
        this.victorySound?.play();
      });
    } else {
      this.victorySound.play();
    }
  }

  getHelpProgress(): number {
    return (this.helpProgress / 300) * 100;
  }

  getHearts(): number {
    return Math.min(MAX_LEVEL, this.hearts);
  }

  getCurrentLevel(): number {
    return Math.min(MAX_LEVEL, Math.max(1, this.currentLevel));
  }

  getNPCInfo() {
    return this.npcList[Math.min(MAX_LEVEL, this.currentLevel) - 1];
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.physics.pause();
      if (this.victorySound?.isPlaying) {
        this.victorySound.pause();
      }
    } else {
      this.physics.resume();
      if (this.victorySound?.isPaused) {
        this.victorySound.resume();
      }
    }

    if (this.onPauseStateChange) {
      this.onPauseStateChange(this.isPaused);
    }
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }
}

// Main Game Component
export default function SkyGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [, setGame] = useState<Phaser.Game | null>(null);
  const [hearts, setHearts] = useState(0);
  const [level, setLevel] = useState(1);
  const [, setHelpProgress] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'complete'>('playing');
  const [currentNPC, setCurrentNPC] = useState<string>('');
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  /** Arrow-lockout nudges use the same on-screen duration as fail-feedback bubbles (see SKY_FAIL_FEEDBACK_MS). */
  const [speechBubbleIsArrowLockout, setSpeechBubbleIsArrowLockout] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sceneRef = useRef<SkyGameScene | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const levelMessages: Record<number, string> = {
    1: 'You saved my life. Thank you so much!',
    2: 'You sure do know how to sweep someone off their feet! Thank you!',
    3: "I thought it was over, until you came through. You're my Saviour!",
    4: "If you ever need anything, I'm at your service.",
    5: "I can't believe you were able to keep me from drowning! Drinks on me!",
  };

  useEffect(() => {
    if (!showSpeechBubble) return;
    const ms = speechBubbleIsArrowLockout ? SKY_FAIL_FEEDBACK_MS : SPEECH_BUBBLE_RESCUE_MS;
    const timer = window.setTimeout(() => {
      setShowSpeechBubble(false);
      setSpeechBubbleIsArrowLockout(false);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [showSpeechBubble, speechBubbleIsArrowLockout]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-hamburger-menu="true"]')) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 2 },
          debug: false,
        },
      },
      scene: SkyGameScene,
    };

    let updateInterval: NodeJS.Timeout;
    const phaserGame = new Phaser.Game(config);
    
    const handleGameReady = () => {
      const scene = phaserGame.scene.getScene('SkyGameScene') as SkyGameScene;
      if (scene) {
        sceneRef.current = scene;

        // Set up callbacks
        scene.onHeartEarned = (newHearts: number, completedLevel: number) => {
          setHearts(newHearts);
          setSpeechBubbleIsArrowLockout(false);
          // Show speech bubble with the message from the completed level
          setSpeechMessage(levelMessages[completedLevel] || '');
          setShowSpeechBubble(true);
        };

        scene.onGameComplete = () => {
          setGameState('complete');
        };

        scene.onPauseStateChange = (paused: boolean) => {
          setIsPaused(paused);
        };

        scene.onArrowDisabledNudge = (message: string) => {
          setSpeechBubbleIsArrowLockout(true);
          setSpeechMessage(message);
          setShowSpeechBubble(true);
        };

        // Update loop for progress bar
        updateInterval = setInterval(() => {
          if (sceneRef.current) {
            setHelpProgress(sceneRef.current.getHelpProgress());
            setLevel(sceneRef.current.getCurrentLevel());
            const npcInfo = sceneRef.current.getNPCInfo();
            if (npcInfo) {
              setCurrentNPC(npcInfo.name);
            }
          }
        }, 50);
      }
    };

    phaserGame.events.on('ready', handleGameReady);
    setGame(phaserGame);

    return () => {
      if (updateInterval) clearInterval(updateInterval);
      phaserGame.destroy(true);
    };
  }, []);

  return (
    <main className="relative w-full h-screen bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-800 flex flex-col">
      {/* Header with stats — above Phaser canvas stacking */}
      <div className="relative z-[10050] isolate overflow-visible bg-black/40 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex gap-8">
            {/* Hearts Counter */}
            <Card className="bg-white/10 border-white/20 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">❤️</span>
                <div>
                  <p className="text-xs text-white/70">Hearts Earned</p>
                  <p className="text-xl font-bold text-white">{hearts}/5</p>
                </div>
              </div>
            </Card>

            {/* Level Info */}
            <Card className="bg-white/10 border-white/20 px-4 py-2">
              <div>
                <p className="text-xs text-white/70">Level</p>
                <p className="text-xl font-bold text-white">{level}</p>
              </div>
            </Card>

            {/* Current NPC */}
            <Card className="bg-white/10 border-white/20 px-4 py-2">
              <div>
                <p className="text-xs text-white/70">Help</p>
                <p className="text-lg font-bold text-white">{currentNPC}</p>
              </div>
            </Card>
          </div>

          <div className="relative" ref={menuRef} data-hamburger-menu="true">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded text-white font-semibold transition"
              aria-label="Game menu"
            >
              ☰
            </button>
            {isMenuOpen && (
              <div
                data-hamburger-menu="true"
                className="absolute right-0 mt-2 w-56 bg-gradient-to-b from-blue-900 to-blue-800 border border-white/30 rounded-lg shadow-lg z-[10060] max-h-[min(70vh,calc(100dvh-6rem))] overflow-y-scroll overscroll-contain pointer-events-auto touch-pan-y [scrollbar-gutter:stable]"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onWheelCapture={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-2 text-white/70 text-xs font-semibold uppercase tracking-wider border-b border-white/10 mt-2">
                  Sky Games
                </div>
                <Link
                  href="/games/sky/play"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🌤️ Sky Challenge (Current)
                </Link>
                <Link
                  href="/games/sky-city/play"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏙️ Sky City Rescue
                </Link>
                <Link
                  href="/games/sky-islands/play"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏝️ Sky Islands
                </Link>
                <Link
                  href="/games/sky-fortress/play"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏰 Sky Fortress
                </Link>

                <div className="px-4 py-2 text-white/70 text-xs font-semibold uppercase tracking-wider border-b border-white/10 mt-2">
                  Other Games
                </div>
                <Link
                  href="/games/sea"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🌊 Savior of the Sea
                </Link>
                <Link
                  href="/games/land"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🌲 Savior of the Land
                </Link>
                <Link
                  href="/games/city"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏢 Saviour of the City
                </Link>

                <Link
                  href="/"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition last:rounded-b-lg cursor-pointer"
                >
                  🏠 Back to Home
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative z-0 flex-1 flex items-center justify-center overflow-hidden">
        <div ref={gameRef} className="shadow-2xl rounded-lg overflow-hidden" />
        
        {/* Speech Bubble */}
        {showSpeechBubble && (
          <div className="absolute top-1/4 right-16 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-xs relative">
              {/* Bubble pointer */}
              <div className="absolute -right-4 top-8 w-0 h-0 border-l-8 border-t-4 border-b-4 border-l-white border-t-transparent border-b-transparent"></div>
              <p className="text-gray-800 text-lg font-semibold leading-relaxed">
                {speechMessage}
              </p>
            </div>
          </div>
        )}

        {isPaused && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="text-center">
              <h2 className="text-5xl font-bold text-white mb-4">⏸ PAUSED</h2>
              <p className="text-white/80 text-lg mb-8">Press SPACE to resume</p>
              <div className="text-white/60 text-sm">
                <p>Use arrow keys to move</p>
                <p>Space to pause/resume</p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Help Progress Bar and Info */}
      <div className="bg-black/40 backdrop-blur-sm border-t border-white/20 p-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-white/70 text-sm mb-2">Stay Alert!</p>
          <p className="text-white/50 text-sm">
            Catch the falling characters before they hit the water. Use arrow keys to move — space bar for pause — you earn
            one heart per rescue. When you&apos;ve saved everyone, the completion screen lets you continue to the next sky
            game or go home.
          </p>
        </div>
      </div>

      {gameState === 'complete' && (
        <SkyGameCompletionCard
          completedPhrase="the Sky Challenge!"
          hearts={hearts}
          tagline="Continue your adventure to the Sky Islands..."
          actions={
            <>
              <Link
                href="/games/sky-islands/play"
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-center font-semibold text-white transition hover:from-purple-400 hover:to-pink-400"
              >
                🏝️ Sky Islands
              </Link>
              <Link
                href="/"
                className="flex-1 rounded-lg bg-gray-400 px-6 py-3 text-center font-semibold text-white transition hover:bg-gray-500"
              >
                Home
              </Link>
            </>
          }
        />
      )}
    </main>
  );
}
