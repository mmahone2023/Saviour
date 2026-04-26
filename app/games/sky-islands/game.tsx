'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Phaser from 'phaser';
import { Card } from '@/components/ui/card';

// Sky Islands Game Scene
class SkyIslandsGameScene extends Phaser.Scene {
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
  private currentSpeed: number = 80;
  private isPaused: boolean = false;
  private pauseText: Phaser.GameObjects.Text | null = null;

  private levelMessages: Record<number, string> = {
    1: 'Thank you for saving me from the void!',
    2: 'You are my hero! Thank you so much!',
    3: "I'm so grateful you caught me!",
    4: 'You saved my life - I will never forget!',
    5: 'You are the greatest sky navigator ever!',
  };

  private npcList: Array<{
    name: string;
    description: string;
  }> = [
    { name: '🧑‍🏫 Scholar', description: 'Save the wise scholar' },
    { name: '🧑‍🎨 Artist', description: 'Rescue the talented artist' },
    { name: '🧑‍🌾 Farmer', description: 'Help the island farmer' },
    { name: '⛵️ Sailor', description: 'Save the brave sailor' },
    { name: '🧝 Island Elder', description: 'Protect the elder' },
  ];

  onHeartEarned: ((hearts: number, level: number) => void) | null = null;
  onGameComplete: ((nextGameUrl?: string) => void) | null = null;
  onPauseStateChange: ((isPaused: boolean) => void) | null = null;
  private victorySound: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super('SkyIslandsGameScene');
  }

  preload() {
    // Load victory sound
    this.load.audio('victory', '/audio/saviour.wav');
  }

  create() {
    // Initialize speed from registry
    const roundData = this.registry.get('skyIslandsRound') || { roundNumber: 1, baseSpeed: 80 };
    this.currentSpeed = roundData.baseSpeed;

    // Set camera background
    this.cameras.main.setBackgroundColor(0x87ceeb);

    // Create floating islands
    this.createIslands();

    // Create player
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
    playerGraphics.generateTexture('player', 30, 30);
    playerGraphics.destroy();

    this.player = this.physics.add.sprite(400, 300, 'player');
    this.player.setCollideWorldBounds(true);

    // Particle emitter
    this.particles = this.add.particles(0xffd700);
    this.particles.stop();

    // Input
    this.cursors = this.input.keyboard?.createCursorKeys() || null;

    // Keep one reusable sound instance for reliable playback.
    this.victorySound = this.sound.add('victory', { volume: 0.8 });

    // Add space key listener for pause/resume
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.togglePause();
    });

    // Create pause text
    this.pauseText = this.add.text(400, 300, 'PAUSED\nPress SPACE to resume', {
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
      backgroundColor: '#000000',
      padding: { x: 20, y: 20 },
    });
    this.pauseText.setOrigin(0.5);
    this.pauseText.setDepth(100);
    this.pauseText.setVisible(false);

    // Create first NPC
    this.createNPC();
  }

  createIslands() {
    // Create floating islands
    const islands = [
      { x: 150, y: 100, width: 100, height: 40 },
      { x: 400, y: 80, width: 120, height: 50 },
      { x: 650, y: 120, width: 100, height: 40 },
      { x: 250, y: 200, width: 80, height: 35 },
      { x: 550, y: 180, width: 90, height: 40 },
    ];

    islands.forEach((island) => {
      const islandShape = this.add.rectangle(island.x, island.y, island.width, island.height, 0x8b6f47);
      islandShape.setDepth(-10);

      // Add some vegetation
      for (let i = 0; i < 2; i++) {
        const tree = this.add.rectangle(
          island.x - island.width / 3 + i * (island.width / 2),
          island.y - island.height / 2 - 15,
          10,
          25,
          0x228b22
        );
        tree.setDepth(-9);
      }
    });
  }

  createNPC() {
    if (this.npc) {
      this.npc.destroy();
    }

    const roundData = this.registry.get('skyIslandsRound') || { roundNumber: 1, baseSpeed: 80 };
    const xPositions = [150, 400, 650, 250, 550, 100, 700];
    const spawnX = xPositions[(roundData.roundNumber - 1) % xPositions.length];

    // Create NPC texture first
    const npcGraphicsIslands = this.make.graphics({ x: 0, y: 0 }, false);
    npcGraphicsIslands.fillStyle(0xff6347, 1);
    npcGraphicsIslands.fillCircle(15, 15, 8);
    npcGraphicsIslands.fillStyle(0xff7f50, 1);
    npcGraphicsIslands.fillCircle(15, 8, 5);
    npcGraphicsIslands.generateTexture('npcIslands', 30, 30);
    npcGraphicsIslands.destroy();

    this.npc = this.physics.add.sprite(spawnX, 50, 'npcIslands');

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

    this.levelComplete = false;
    this.isCarrying = false;
    this.npcHasBeenTouched = false;
  }

  private updatePauseText() {
    if (this.pauseText) {
      this.pauseText.setVisible(true);
    }
  }

  update() {
    if (!this.player || this.isPaused || (this.levelComplete && !this.isCarrying)) return;

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

    if (this.npc) {
      this.npc.setVelocity(this.baseVelocity.x, this.baseVelocity.y);

      // Check if NPC falls beyond screen
      if (this.npc.y > 600 && !this.npcHasBeenTouched) {
        this.time.delayedCall(3000, () => {
          this.levelComplete = true;
          this.scene.restart();
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
          this.npcHasBeenTouched = true;
          this.isCarrying = true;

          if (this.onHeartEarned) {
            this.hearts += 1;
            this.onHeartEarned(this.hearts, this.currentLevel);
          }

          if (this.particles) {
            this.particles.emitParticleAt(this.npc.x, this.npc.y, 10);
          }

          this.completeLevel();
        }
      }
    }
  }

  completeLevel() {
    this.levelComplete = true;

    if (this.npc) {
      this.tweens.add({
        targets: this.npc,
        y: -50,
        scale: 1.2,
        duration: 2000,
        ease: 'Quad.easeInOut',
      });
    }

    const goToNextStep = () => {
      if (this.currentLevel < 5) {
        this.nextLevel();
      } else {
        const currentRoundData =
          this.registry.get('skyIslandsRound') || {
            roundNumber: 1,
            baseSpeed: 80,
          };

        if (currentRoundData.roundNumber === 1) {
          if (this.onGameComplete) {
            this.onGameComplete('/games/sky-fortress/play');
          }
        } else {
          const newRoundData = {
            roundNumber: currentRoundData.roundNumber + 1,
            baseSpeed: currentRoundData.baseSpeed + 2,
          };

          this.registry.set('skyIslandsRound', newRoundData);
          this.scene.restart();
        }
      }
    };

    try {
      if (!this.victorySound) {
        this.victorySound = this.sound.add('victory', { volume: 0.8 });
      }

      // Stop any currently playing instance and replay from the start.
      if (this.victorySound.isPlaying) {
        this.victorySound.stop();
      }

      this.victorySound.once(Phaser.Sound.Events.COMPLETE, () => {
        goToNextStep();
      });

      const playVictory = () => {
        this.victorySound?.play();
      };

      if (this.sound.locked) {
        this.sound.once(Phaser.Sound.Events.UNLOCKED, playVictory);
      } else {
        playVictory();
      }
    } catch (e) {
      console.log('Victory sound failed to play:', e);
      goToNextStep();
    }
  }

  nextLevel() {
    this.currentLevel += 1;
    this.createNPC();
  }

  togglePause() {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.physics.pause();
      this.updatePauseText();
      if (this.victorySound?.isPlaying) {
        this.victorySound.pause();
      }
    } else {
      this.physics.resume();
      if (this.pauseText) {
        this.pauseText.setVisible(false);
      }
      if (this.victorySound?.isPaused) {
        this.victorySound.resume();
      }
    }

    if (this.onPauseStateChange) {
      this.onPauseStateChange(this.isPaused);
    }
  }
  
  getHearts(): number {
    return this.hearts;
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }
}

// Main Component
export default function SkyIslandsGame() {
  const router = useRouter();
  const gameRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [hearts, setHearts] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'complete'>('playing');
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sceneRef = useRef<SkyIslandsGameScene | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const levelMessages: Record<number, string> = {
    1: 'Thank you for saving me from the void!',
    2: 'You are my hero! Thank you so much!',
    3: "I'm so grateful you caught me!",
    4: 'You saved my life - I will never forget!',
    5: 'You are the greatest sky navigator ever!',
  };

  useEffect(() => {
    if (showSpeechBubble) {
      const timer = setTimeout(() => {
        setShowSpeechBubble(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showSpeechBubble]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
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
      audio: {
        disableWebAudio: false,
      },
      scene: SkyIslandsGameScene,
    };

    const phaserGame = new Phaser.Game(config);
    let updateInterval: NodeJS.Timeout;

    const handleGameReady = () => {
      const scene = phaserGame.scene.getScene('SkyIslandsGameScene') as SkyIslandsGameScene;
      if (scene) {
        sceneRef.current = scene;

        scene.onHeartEarned = (newHearts: number, completedLevel: number) => {
          setHearts(newHearts);
          setSpeechMessage(levelMessages[completedLevel] || '');
          setShowSpeechBubble(true);
        };

        scene.onGameComplete = (nextGameUrl?: string) => {
          if (nextGameUrl) {
            router.push(nextGameUrl);
          } else {
            setGameState('complete');
          }
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
    <main className="w-full h-screen bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-800 flex flex-col">
      <div className="bg-black/40 backdrop-blur-sm border-b border-white/20 p-4">
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

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded text-white font-semibold transition"
              aria-label="Game menu"
            >
              ☰
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-gradient-to-b from-blue-900 to-blue-800 border border-white/30 rounded-lg shadow-lg z-50 max-h-96 overflow-y-scroll overscroll-contain">
                {/* Sky Games Section */}
                <div className="px-4 py-2 text-white/70 text-xs font-semibold uppercase tracking-wider border-b border-white/10 mt-2">
                  Sky Games
                </div>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/games/sky-city/play');
                  }}
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏙️ Sky City Rescue
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/games/sky-islands/play');
                  }}
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏝️ Sky Islands (Current)
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/games/sky-fortress/play');
                  }}
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏰 Sky Fortress
                </button>
                
                {/* Other Games Section */}
                <div className="px-4 py-2 text-white/70 text-xs font-semibold uppercase tracking-wider border-b border-white/10 mt-2">
                  Other Games
                </div>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/games/sea');
                  }}
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🌊 Savior of the Sea
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/games/land');
                  }}
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🌲 Savior of the Land
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/games/city');
                  }}
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏢 Saviour of the City
                </button>
                
                {/* Home Link */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/');
                  }}
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition last:rounded-b-lg cursor-pointer"
                >
                  🏠 Back to Home
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
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
      </div>

      <div className="bg-black/40 backdrop-blur-sm border-t border-white/20 p-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-white/70 text-sm mb-2">Save Them All!</p>
          <p className="text-white/50 text-sm">
            Catch the falling island dwellers! Use arrow keys to move. Guide them to safety.
          </p>
        </div>
      </div>

      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Card className="bg-gradient-to-b from-yellow-100 to-yellow-50 p-8 max-w-md text-center shadow-2xl">
            <div className="text-6xl mb-4">🏝️</div>
            <h2 className="text-3xl font-bold text-yellow-900 mb-2">
              Islands Saved!
            </h2>
            <p className="text-lg text-yellow-700 mb-4">
              You've completed the Sky Islands!
            </p>
            <p className="text-2xl font-bold text-yellow-600 mb-6">
              Total Hearts: {hearts}/5
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/games/sky-islands/play')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-semibold rounded-lg hover:from-sky-300 hover:to-blue-400 transition cursor-pointer"
              >
                Play Again
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-6 py-3 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition cursor-pointer"
              >
                Home
              </button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
