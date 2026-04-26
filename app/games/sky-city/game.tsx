'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';

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
  private currentSpeed: number = 60;
  private contactTime: number = 0;
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
  private victorySound: Phaser.Sound.BaseSound | null = null;

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

  createNPC() {
    if (this.npc) {
      this.npc.destroy();
    }

    // Get round data to vary spawn position
    const roundData = this.registry.get('skyCityRound') || { roundNumber: 1, baseSpeed: 60 };
    const roundNumber = roundData.roundNumber;
    
    // Vary x position based on round
    const xPositions = [150, 400, 650, 250, 550];
    const buildingX = xPositions[this.currentLevel - 1];
    
    // Create NPC texture first
    const npcGraphicsCity = this.make.graphics({ x: 0, y: 0 }, false);
    npcGraphicsCity.fillStyle(0xff6347, 1);
    npcGraphicsCity.fillCircle(15, 15, 8);
    npcGraphicsCity.fillStyle(0xff7f50, 1);
    npcGraphicsCity.fillCircle(15, 8, 5);
    npcGraphicsCity.generateTexture('npcCity', 30, 30);
    npcGraphicsCity.destroy();

    // Start NPC at building height
    this.npc = this.physics.add.sprite(buildingX, 80, 'npcCity');
    
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


    this.helpRadius = 100;
    this.levelComplete = false;
    this.isCarrying = false;
    this.npcHasBeenTouched = false;
  }

  update() {
    if (!this.player || this.levelComplete) return;

    const speed = 200;
    this.player.setVelocity(0);

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

    // Check if carrying NPC
    if (this.isCarrying && this.npc) {
      this.npc.setPosition(this.player.x, this.player.y - 30);
      
      const flySpeed = 40;
      const flyAngle = -45;
      const flyVx = flySpeed * Math.cos(flyAngle * Math.PI / 180);
      const flyVy = flySpeed * Math.sin(flyAngle * Math.PI / 180);
      
      this.player.setVelocity(flyVx, flyVy);
      this.npc.setVelocity(flyVx, flyVy);
      
      const elapsedTime = this.time.now - this.contactTime;
      if (elapsedTime >= 10000) {
        this.completeLevel();
      }
    } else if (this.npc) {
      this.npc.setVelocity(this.baseVelocity.x, this.baseVelocity.y);
      
      // Check if NPC falls off screen
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
          this.contactTime = this.time.now;
          
          if (this.onHeartEarned) {
            this.hearts += 1;
            this.onHeartEarned(this.hearts, this.currentLevel);
          }

          if (this.particles) {
            this.particles.emitParticleAt(this.npc.x, this.npc.y, 10);
          }
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

    // Play victory sound (sound.play returns boolean, so keep a BaseSound instance)
    try {
      if (this.victorySound) {
        this.victorySound.stop();
        this.victorySound.destroy();
      }

      this.victorySound = this.sound.add('victory', { volume: 0.8 });

      const playVictorySound = () => {
        this.victorySound?.play();
      };

      if (this.sound.locked) {
        this.sound.once(Phaser.Sound.Events.UNLOCKED, playVictorySound);
      } else {
        playVictorySound();
      }
    } catch (e) {
      console.log('Victory sound failed to play:', e);
    }

    if (this.npc) {
      // Animate NPC rising to top while celebrating
      this.tweens.add({
        targets: this.npc,
        y: -50,
        scale: 1.2,
        duration: 2000,
        ease: 'Quad.easeInOut',
      });
    }

    if (this.currentLevel < 5) {
      // Wait for audio to finish or 2.5 seconds before next level
      const audioDuration = this.victorySound?.duration || 0;
      const delayTime = Math.max(2500, audioDuration * 1000 + 500);
      
      this.time.delayedCall(delayTime, () => {
        this.nextLevel();
      });
    } else {
      const currentRoundData = this.registry.get('skyCityRound') || { roundNumber: 1, baseSpeed: 60 };
      const newRoundData = {
        roundNumber: currentRoundData.roundNumber + 1,
        baseSpeed: currentRoundData.baseSpeed + 2,
      };
      this.registry.set('skyCityRound', newRoundData);
      
      // Wait for audio to finish or 2.5 seconds before restarting
      const audioEndTime = this.victorySound?.duration || 0;
      const delayTime = Math.max(2500, audioEndTime * 1000 + 500);

      this.time.delayedCall(delayTime, () => {
        this.scene.restart();
      });
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.physics.pause();
    } else {
      this.physics.resume();
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
  const [isPaused, setIsPaused] = useState(false);

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
                  🏙️ Sky City Rescue (Current)
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

      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Card className="bg-gradient-to-b from-yellow-100 to-yellow-50 p-8 max-w-md text-center shadow-2xl">
            <div className="text-6xl mb-4">🏙️</div>
            <h2 className="text-3xl font-bold text-yellow-900 mb-2">
              Sky City Champion!
            </h2>
            <p className="text-lg text-yellow-700 mb-4">
              You've saved everyone in the city!
            </p>
            <p className="text-2xl font-bold text-yellow-600 mb-6">
              Total Hearts: {hearts}/5
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => router.push('/games/sky-city/play')}
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
