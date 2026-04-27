'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { useRouter } from 'next/navigation';
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
  SKY_CITY_FAIL_MESSAGES,
  SKY_FAIL_FEEDBACK_MS,
} from '@/app/games/sky-rescue-fail-bubbles';

const SPEECH_BUBBLE_RESCUE_MS = 10000;

const MAX_LEVEL = 5;

// Sky City Game Scene
class SkyCityGameScene extends Phaser.Scene {
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private npc: Phaser.Physics.Arcade.Sprite | null = null;
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private currentLevel: number = 1;
  private hearts: number = 0;
  private helpRadius: number = 100;
  private levelComplete: boolean = false;
  private isCarrying: boolean = false;
  private baseVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private npcHasBeenTouched: boolean = false;
  /** Avoids stacking multiple scene.restart timers while the NPC stays past the fail line. */
  private drownRestartScheduled: boolean = false;
  private drownFailTimer: Phaser.Time.TimerEvent | null = null;
  private inVictorySequence: boolean = false;
  private failBubbleLayer: Phaser.GameObjects.Container | null = null;
  private victoryAdvanceSeq: number = 0;
  private lastVictoryHandledSeq: number = -999;
  private currentSpeed: number = 60;
  private isPaused: boolean = false;
  
  private levelMessages: Record<number, string> = {
    1: 'Thank you for saving me from the rooftop!',
    2: 'You caught me mid-fall! You are a true hero!',
    3: 'I thought I was a goner! You are amazing!',
    4: 'You have incredible reflexes!',
    5: 'You are the greatest hero in the sky city!',
  };
  
  private npcList: Array<{
    name: string;
    description: string;
  }> = [
    { name: '👨‍💼 Worker', description: 'Save the worker falling from the office building' },
    { name: '👩‍💼 Executive', description: 'Catch the executive falling from the tower' },
    { name: '🧑‍🔧 Technician', description: 'Help the technician falling from the tech building' },
    { name: '👨‍⚕️ Doctor', description: 'Save the doctor from the hospital rooftop' },
    { name: '👨‍🎓 Professor', description: 'Rescue the professor from the university' },
  ];

  onHeartEarned: ((hearts: number, level: number) => void) | null = null;
  onGameComplete: (() => void) | null = null;
  onPauseStateChange: ((isPaused: boolean) => void) | null = null;
  onArrowDisabledNudge: ((message: string) => void) | null = null;
  private victorySound: Phaser.Sound.BaseSound | null = null;
  private skyArrowChallenge: SkyArrowChallengeState = createSkyArrowChallengeState();

  constructor() {
    super('SkyCityGameScene');
  }

  preload() {
    // Load victory sound
    this.load.audio('victory', '/audio/saviour.wav');
  }

  create() {
    // Initialize speed from registry
    const roundData = this.registry.get('skyCityRound') || { roundNumber: 1, baseSpeed: 60 };
    this.currentSpeed = roundData.baseSpeed;

    this.currentLevel = 1;
    this.hearts = 0;
    this.lastVictoryHandledSeq = -999;
    this.inVictorySequence = false;
    this.drownFailTimer = null;
    this.failBubbleLayer = null;

    // Set camera background
    this.cameras.main.setBackgroundColor(0x87ceeb);

    // Create sky city buildings background
    this.createBuildings();

    // Create player with simple graphics
    const playerGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    playerGraphics.fillStyle(0xffc0cb, 1);
    playerGraphics.fillCircle(15, 15, 8);
    playerGraphics.fillStyle(0xfdb4b4, 1);
    playerGraphics.fillCircle(15, 8, 5);
    playerGraphics.lineStyle(3, 0xc41e3a);
    playerGraphics.beginPath();
    playerGraphics.moveTo(7, 15);
    playerGraphics.lineTo(3, 25);
    playerGraphics.stroke();
    playerGraphics.beginPath();
    playerGraphics.moveTo(23, 15);
    playerGraphics.lineTo(27, 25);
    playerGraphics.stroke();
    playerGraphics.generateTexture('playerTex', 30, 30);
    playerGraphics.destroy();

    this.player = this.physics.add.sprite(400, 300, 'playerTex');
    this.player.setCollideWorldBounds(true);

    // Particle emitter
    this.particles = this.add.particles(0xffd700);
    this.particles.stop();

    // Input
    this.cursors = this.input.keyboard?.createCursorKeys() || null;

    // Add space key for pause
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.togglePause();
    });

    this.victorySound = this.sound.add('victory', { volume: 0.8 });
    this.skyArrowChallenge = createSkyArrowChallengeState();

    // Create first NPC
    this.createNPC();
  }

  createBuildings() {
    // Create simple buildings
    const building1 = this.add.rectangle(150, 250, 80, 200, 0x4a4a4a);
    building1.setDepth(-10);
    
    const building2 = this.add.rectangle(400, 150, 100, 300, 0x5a5a5a);
    building2.setDepth(-10);
    
    const building3 = this.add.rectangle(650, 200, 90, 250, 0x6a6a6a);
    building3.setDepth(-10);

    // Add windows to buildings
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 6; j++) {
        const window = this.add.rectangle(
          150 + i * 250 - 25 + (i % 2) * 50,
          200 + j * 40,
          15,
          15,
          0xffff99
        );
        window.setDepth(-9);
      }
    }
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

  createNPC() {
    destroyTaggedRescueNpcs(this, this.player);
    if (this.npc) {
      this.npc.destroy();
      this.npc = null;
    }
    this.cancelPendingDrownRestart();

    // Get round data to vary spawn position
    const roundData = this.registry.get('skyCityRound') || { roundNumber: 1, baseSpeed: 60 };
    const roundNumber = roundData.roundNumber;
    
    // Vary x position based on round
    const xPositions = [150, 400, 650, 250, 550];
    const buildingX = xPositions[Math.min(MAX_LEVEL, this.currentLevel) - 1];
    const lvl = Math.min(MAX_LEVEL, Math.max(1, this.currentLevel));
    const npcTexKey = `npcCity_lv_${lvl}`;

    // Create NPC texture first
    const npcGraphicsCity = this.make.graphics({ x: 0, y: 0 }, false);
    npcGraphicsCity.fillStyle(0xff6347, 1);
    npcGraphicsCity.fillCircle(15, 15, 8);
    npcGraphicsCity.fillStyle(0xff7f50, 1);
    npcGraphicsCity.fillCircle(15, 8, 5);
    npcGraphicsCity.generateTexture(npcTexKey, 30, 30);
    npcGraphicsCity.destroy();

    // Start NPC at building height
    this.npc = this.physics.add.sprite(buildingX, 80, npcTexKey);
    
    // Calculate falling velocity (almost vertical)
    const angle = 5;
    const angleRad = angle * Math.PI / 180;
    const speed = this.currentSpeed;
    
    const direction = this.currentLevel % 2 === 1 ? 1 : -1;
    const vx = speed * Math.sin(angleRad) * direction;
    const vy = speed * Math.cos(angleRad);
    
    this.npc.setVelocity(vx, vy);
    this.baseVelocity = { x: vx, y: vy };
    this.npc.setCollideWorldBounds(false);
    this.npc.setDepth(10);
    this.npc.setData(SKY_RESCUE_NPC_DATA_KEY, true);

    this.helpRadius = 100;
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

    const speed = 200;
    this.player.setVelocity(0);

    if (this.isCarrying && this.npc) {
      this.npc.setPosition(this.player.x, this.player.y - 30);

      const flySpeed = 40;
      const flyAngle = -45;
      const flyVx = flySpeed * Math.cos(flyAngle * Math.PI / 180);
      const flyVy = flySpeed * Math.sin(flyAngle * Math.PI / 180);

      this.player.setVelocity(flyVx, flyVy);
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

      // Check if NPC falls off screen
      if (
        this.npc.y > 600 &&
        !this.npcHasBeenTouched &&
        !this.drownRestartScheduled &&
        !this.inVictorySequence
      ) {
        this.drownRestartScheduled = true;
        if (!this.failBubbleLayer) {
          this.failBubbleLayer = mountSkyFailBubbleMessages(this, SKY_CITY_FAIL_MESSAGES);
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

      // Check distance to player
      if (this.player) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          this.npc.x,
          this.npc.y
        );

        if (distance < this.helpRadius && !this.npcHasBeenTouched) {
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

    this.victorySound.off(Phaser.Sound.Events.COMPLETE);
    if (this.victorySound.isPlaying) {
      this.victorySound.stop();
    }

    this.victorySound.once(Phaser.Sound.Events.COMPLETE, () => {
      if (seq !== this.victoryAdvanceSeq) return;
      continueToNextCharacter();
    });

    this.sound.off(Phaser.Sound.Events.UNLOCKED);
    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        if (seq !== this.victoryAdvanceSeq) return;
        this.victorySound?.play();
      });
    } else {
      this.victorySound.play();
    }

    if (this.npc) {
      this.tweens.add({
        targets: this.npc,
        y: -50,
        scale: 1.2,
        duration: 2000,
        ease: 'Quad.easeInOut',
      });
    }
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

  getHearts(): number {
    return Math.min(MAX_LEVEL, this.hearts);
  }

  getCurrentLevel(): number {
    return Math.min(MAX_LEVEL, Math.max(1, this.currentLevel));
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }
}

// Main Component
export default function SkyCityGame() {
  const router = useRouter();
  const gameRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [hearts, setHearts] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'complete'>('playing');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sceneRef = useRef<SkyCityGameScene | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const levelMessages: Record<number, string> = {
    1: 'Thank you for saving me from the rooftop!',
    2: 'You caught me mid-fall! You are a true hero!',
    3: 'I thought I was a goner! You are amazing!',
    4: 'You have incredible reflexes!',
    5: 'You are the greatest hero in the sky city!',
  };

  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  const [speechBubbleIsArrowLockout, setSpeechBubbleIsArrowLockout] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

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
      backgroundColor: '#87ceeb',
      render: {
        antialias: true,
        antialiasGL: true,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 2 },
          debug: false,
        },
      },
      audio: {
        disableWebAudio: false,
      },
      scene: SkyCityGameScene,
    };

    const phaserGame = new Phaser.Game(config);
    let updateInterval: NodeJS.Timeout;

    const handleGameReady = () => {
      const scene = phaserGame.scene.getScene('SkyCityGameScene') as SkyCityGameScene;
      if (scene) {
        sceneRef.current = scene;

        scene.onHeartEarned = (newHearts: number, completedLevel: number) => {
          setHearts(newHearts);
          setSpeechBubbleIsArrowLockout(false);
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

        updateInterval = setInterval(() => {
          if (sceneRef.current) {
            setLevel(sceneRef.current.getCurrentLevel());
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
      <div className="relative z-[10050] isolate overflow-visible bg-black/40 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex gap-8">
            <Card className="bg-white/10 border-white/20 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">❤️</span>
                <div>
                  <p className="text-xs text-white/70">Hearts Earned</p>
                  <p className="text-xl font-bold text-white">{hearts}/5</p>
                </div>
              </div>
            </Card>

            <Card className="bg-white/10 border-white/20 px-4 py-2">
              <div>
                <p className="text-xs text-white/70">Level</p>
                <p className="text-xl font-bold text-white">{level}</p>
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
                {/* Sky Games Section */}
                <div className="px-4 py-2 text-white/70 text-xs font-semibold uppercase tracking-wider border-b border-white/10 mt-2">
                  Sky Games
                </div>
                <Link
                  href="/games/sky/play"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🌤️ Sky Challenge
                </Link>
                <Link
                  href="/games/sky-city/play"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏙️ Sky City Rescue (Current)
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
                
                {/* Other Games Section */}
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
                
                {/* Home Link */}
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

      <div className="relative z-0 flex-1 flex items-center justify-center overflow-hidden">
        <div ref={gameRef} className="shadow-2xl rounded-lg overflow-hidden" />
        
        {showSpeechBubble && (
          <div className="absolute top-1/4 right-16 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-xs relative">
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

      <div className="bg-black/40 backdrop-blur-sm border-t border-white/20 p-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-white/70 text-sm mb-2">City rescue</p>
          <p className="text-white/50 text-sm">
            Arrow keys to move — space bar for pause — one heart per rescue. Finish all five saves to open the completion
            screen with replay or home.
          </p>
        </div>
      </div>

      {gameState === 'complete' && (
        <SkyGameCompletionCard
          completedPhrase="Sky City Rescue!"
          hearts={hearts}
          actions={
            <>
              <button
                type="button"
                onClick={() => router.push('/games/sky-city/play')}
                className="flex-1 cursor-pointer rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-3 font-semibold text-white transition hover:from-sky-300 hover:to-blue-400"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 rounded-lg bg-gray-400 px-6 py-3 font-semibold text-white transition hover:bg-gray-500"
              >
                Home
              </button>
            </>
          }
        />
      )}
    </main>
  );
}
