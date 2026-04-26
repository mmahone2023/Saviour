'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';

// Sky Fortress Game Scene
class SkyFortressGameScene extends Phaser.Scene {
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
  private currentSpeed: number = 85;
  private isPaused: boolean = false;

  private levelMessages: Record<number, string> = {
    1: 'I can\'t thank you enough for saving me!',
    2: 'You are my saviour! I owe you my life!',
    3: 'I cannot believe you caught me mid-air!',
    4: 'You are braver than any warrior I know!',
    5: 'You are the greatest defender of the sky fortress!',
  };

  private npcList: Array<{
    name: string;
    description: string;
  }> = [
    { name: '⚔️ Knight', description: 'Save the brave knight' },
    { name: '🛡️ Guard', description: 'Rescue the fortress guard' },
    { name: '👑 noble', description: 'Help the noble' },
    { name: '🧙 Mage', description: 'Save the fortress mage' },
    { name: '🏰 Warden', description: 'Protect the fortress warden' },
  ];

  onHeartEarned: ((hearts: number, level: number) => void) | null = null;
  onGameComplete: (() => void) | null = null;
  onPauseStateChange: ((isPaused: boolean) => void) | null = null;
  private victorySound: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super('SkyFortressGameScene');
  }

  preload() {
    // Load victory sound
    this.load.audio('victory', '/audio/saviour.wav');
  }

  create() {
    const roundData = this.registry.get('skyFortressRound') || { roundNumber: 1, baseSpeed: 85 };
    this.currentSpeed = roundData.baseSpeed;

    this.cameras.main.setBackgroundColor(0x87ceeb);

    this.createFortresses();

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

    this.particles = this.add.particles(0xffd700);
    this.particles.stop();

    this.cursors = this.input.keyboard?.createCursorKeys() || null;

    // Add space key for pause
    this.input.keyboard?.on('keydown-SPACE', () => {
      this.togglePause();
    });

    this.victorySound = this.sound.add('victory', { volume: 0.8 });

    this.createNPC();
  }

  createFortresses() {
    // Create castle/fortress structures
    const fortresses = [
      { x: 100, y: 150, width: 80, height: 120 },
      { x: 400, y: 120, width: 100, height: 150 },
      { x: 700, y: 140, width: 80, height: 130 },
      { x: 250, y: 180, width: 70, height: 100 },
      { x: 550, y: 160, width: 85, height: 110 },
    ];

    fortresses.forEach((fortress, index) => {
      // Main tower
      const tower = this.add.rectangle(fortress.x, fortress.y, fortress.width, fortress.height, 0xa9a9a9);
      tower.setDepth(-10);

      // Towers (crenellations)
      const towerSize = 15;
      for (let i = 0; i < 3; i++) {
        const crenellation = this.add.rectangle(
          fortress.x - fortress.width / 2 + towerSize + i * 20,
          fortress.y - fortress.height / 2 - 10,
          towerSize,
          20,
          0x696969
        );
        crenellation.setDepth(-9);
      }

      // Windows
      for (let i = 0; i < 3; i++) {
        const window = this.add.rectangle(
          fortress.x,
          fortress.y - 30 + i * 35,
          12,
          12,
          0xffff99
        );
        window.setDepth(-8);
      }
    });
  }

  createNPC() {
    if (this.npc) {
      this.npc.destroy();
    }

    const roundData = this.registry.get('skyFortressRound') || { roundNumber: 1, baseSpeed: 85 };
    const xPositions = [100, 400, 700, 250, 550, 150, 650];
    const spawnX = xPositions[(roundData.roundNumber - 1) % xPositions.length];

    // Create NPC texture first
    const npcGraphicsFortress = this.make.graphics({ x: 0, y: 0 }, false);
    npcGraphicsFortress.fillStyle(0xff6347, 1);
    npcGraphicsFortress.fillCircle(15, 15, 8);
    npcGraphicsFortress.fillStyle(0xff7f50, 1);
    npcGraphicsFortress.fillCircle(15, 8, 5);
    npcGraphicsFortress.generateTexture('npcFortress', 30, 30);
    npcGraphicsFortress.destroy();

    this.npc = this.physics.add.sprite(spawnX, 50, 'npcFortress');

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

    // Create NPC graphics
    const npcGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    npcGraphics.fillStyle(0xff6347, 1); // Tomato red
    npcGraphics.fillCircle(15, 15, 8);
    npcGraphics.fillStyle(0xff7f50, 1); // Coral
    npcGraphics.fillCircle(15, 8, 5);
    npcGraphics.generateTexture('npc', 30, 30);
    npcGraphics.destroy();

    this.npc.setTexture('npc');

    this.levelComplete = false;
    this.isCarrying = false;
    this.npcHasBeenTouched = false;
  }

  update() {
    if (!this.player || this.isPaused || (this.levelComplete && !this.isCarrying)) return;

    const speed = 300;
    this.player.setVelocity(0);

    if (this.isCarrying && this.npc) {
      // Keep Saviour and rescued character "fused" while rising.
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

      if (this.npc.y > 600 && !this.npcHasBeenTouched) {
        this.time.delayedCall(3000, () => {
          this.levelComplete = true;
          this.scene.restart();
        });
      }

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

          // Trigger level completion immediately on successful rescue.
          this.completeLevel();
        }
      }
    }
  }

  nextLevel() {
    this.currentLevel += 1;
    this.createNPC();
  }

  completeLevel() {
    this.levelComplete = true;

    const continueToNextCharacter = () => {
      if (this.currentLevel < 5) {
        this.nextLevel();
      } else {
        const currentRoundData =
          this.registry.get('skyFortressRound') || { roundNumber: 1, baseSpeed: 85 };

        const newRoundData = {
          roundNumber: currentRoundData.roundNumber + 1,
          baseSpeed: currentRoundData.baseSpeed + 2,
        };

        this.registry.set('skyFortressRound', newRoundData);
        this.scene.restart();
      }
    };

    if (!this.victorySound) {
      this.victorySound = this.sound.add('victory', { volume: 0.8 });
    }

    if (this.victorySound.isPlaying) {
      this.victorySound.stop();
    }

    this.victorySound.once(Phaser.Sound.Events.COMPLETE, () => {
      continueToNextCharacter();
    });

    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        this.victorySound?.play();
      });
    } else {
      this.victorySound.play();
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
    return this.hearts;
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }
}

export default function SkyFortressGame() {
  const router = useRouter();
  const gameRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [hearts, setHearts] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'complete'>('playing');
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sceneRef = useRef<SkyFortressGameScene | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const levelMessages: Record<number, string> = {
    1: 'Thank you for saving me from the fortress fall!',
    2: 'You are my saviour! I owe you my life!',
    3: 'I cannot believe you caught me mid-air!',
    4: 'You are braver than any warrior I know!',
    5: 'You are the greatest hero of the sky fortress!',
  };

  const saviorReplies: string[] = [
    "If the situation was changed, you wouldn't let me fall would you?",
    "How 'bout you just buy me a steak dinner instead?",
    "You'd be surprised how many times I've done this!",
    "My pleasure, but you must not know too many people!",
    "No one is lost on my watch!",
    "You're worth saving!",
    "I'm just glad I was there to catch you!",
    ];

  const [isSaviorReply, setIsSaviorReply] = useState(false);
  const [saviorMessage, setSaviorMessage] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (showSpeechBubble) {
      if (!isSaviorReply) {
        // Show character message for 2.5 seconds, then show Saviour's reply
        const charTimer = setTimeout(() => {
          const randomReply = saviorReplies[Math.floor(Math.random() * saviorReplies.length)];
          setSaviorMessage(randomReply);
          setIsSaviorReply(true);
        }, 2500);
        return () => clearTimeout(charTimer);
      } else {
        // Show Saviour's reply for 2.5 seconds, then hide
        const saviorTimer = setTimeout(() => {
          setShowSpeechBubble(false);
          setIsSaviorReply(false);
        }, 2500);
        return () => clearTimeout(saviorTimer);
      }
    }
  }, [showSpeechBubble, isSaviorReply, saviorReplies]);

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
      scene: SkyFortressGameScene,
    };

    const phaserGame = new Phaser.Game(config);
    let updateInterval: NodeJS.Timeout;

    const handleGameReady = () => {
      const scene = phaserGame.scene.getScene('SkyFortressGameScene') as SkyFortressGameScene;
      if (scene) {
        sceneRef.current = scene;

        scene.onHeartEarned = (newHearts: number, completedLevel: number) => {
          setHearts(newHearts);
          setSpeechMessage(levelMessages[completedLevel] || '');
          setShowSpeechBubble(true);
        };

        scene.onGameComplete = () => {
          setGameState('complete');
        };

        scene.onPauseStateChange = (paused: boolean) => {
          setIsPaused(paused);
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
              <div className="absolute right-0 mt-2 w-56 bg-gradient-to-b from-blue-900 to-blue-800 border border-white/30 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
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
                  🏝️ Sky Islands
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/games/sky-fortress/play');
                  }}
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏰 Sky Fortress (Current)
                </button>
                
                {/* Other Games Section */}
                <div className="px-4 py-2 text-white/70 text-xs font-semibold uppercase tracking-wider border-b border-white/10 mt-2">
                  Other Games
                </div>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/games/sea/game');
                  }}
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🌊 Savior of the Sea
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/games/land/game');
                  }}
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🌲 Savior of the Land
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push('/games/city/game');
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
          <div className={`absolute top-1/4 animate-in fade-in duration-500 ${isSaviorReply ? 'left-16 slide-in-from-left-4' : 'right-16 slide-in-from-right-4'}`}>
            <div className={`rounded-lg shadow-2xl p-6 max-w-xs relative ${isSaviorReply ? 'bg-pink-200' : 'bg-white'}`}>
              <div className={`absolute top-8 w-0 h-0 border-t-4 border-b-4 ${isSaviorReply ? '-left-4 border-r-8 border-r-pink-200 border-t-transparent border-b-transparent' : '-right-4 border-l-8 border-l-white border-t-transparent border-b-transparent'}`}></div>
              <p className={`text-lg font-semibold leading-relaxed ${isSaviorReply ? 'text-pink-900' : 'text-gray-800'}`}>
                {isSaviorReply ? saviorMessage : speechMessage}
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
          <p className="text-white/70 text-sm mb-2">Defend The Fortress!</p>
          <p className="text-white/50 text-sm">
            Catch the fortress dwellers before they fall! Use arrow keys to move. Protect them from the void.
          </p>
        </div>
      </div>

      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Card className="bg-gradient-to-b from-yellow-100 to-yellow-50 p-8 max-w-md text-center shadow-2xl">
            <div className="text-6xl mb-4">🏰</div>
            <h2 className="text-3xl font-bold text-yellow-900 mb-2">
              Fortress Defended!
            </h2>
            <p className="text-lg text-yellow-700 mb-4">
              You've completed the Sky Fortress!
            </p>
            <p className="text-2xl font-bold text-yellow-600 mb-6">
              Total Hearts: {hearts}/5
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/games/sky-fortress/play')}
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
