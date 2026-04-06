'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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
  private npcHelpPoint: Phaser.Math.Vector2 | null = null;
  private levelComplete: boolean = false;
  private canTransitionToNextLevel: boolean = false;
  private levelMessages: Record<number, string> = {
    1: 'You saved my life. Thank you so much!',
    2: 'You sure do know how to sweep someone off their feet! Thank you!',
    3: "I thought it was over, until you came through. You're my Saviour!",
    4: "If you ever need anything, I'm at your service.",
    5: "I can't believe you were able to keep me from drowning! Drinks on me!",
  };
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
      name: '⭐ Sky Guardian',
      emotion: 'Weakened',
      x: 700,
      y: 110,
      description: 'Restore power to the sky guardian',
    },
  ];

  onHeartEarned: ((hearts: number, level: number) => void) | null = null;
  onLevelComplete: ((level: number) => void) | null = null;
  onGameComplete: (() => void) | null = null;

  constructor() {
    super({ key: 'SkyGameScene' });
  }

  preload() {
    // Generate simple graphics for assets
  }

  create() {
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
    this.player = this.physics.add.sprite(100, 300, null);
    this.player.setScale(1.5);
    this.player.setBounce(0.2);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // Create simple player graphics (person with cape)
    const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
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
    this.particles.emitZoneSource = new Phaser.Geom.Circle(0, 0, 20);
    this.particles.stop();

    // Input
    this.cursors = this.input.keyboard?.createCursorKeys();

    // Set up physics
    this.physics.world.setBounds(0, 0, 800, 600);
  }

  addClouds() {
    // Add simple cloud shapes using ellipses
    const clouds = [
      { x: 100, y: 100, scaleX: 1, scaleY: 1 },
      { x: 300, y: 150, scaleX: 1.2, scaleY: 1.2 },
      { x: 600, y: 200, scaleX: 1, scaleY: 1 },
      { x: 200, y: 350, scaleX: 0.8, scaleY: 0.8 },
    ];

    clouds.forEach(cloud => {
      const cloudGraphic = this.add.ellipse(cloud.x, cloud.y, 60 * cloud.scaleX, 25 * cloud.scaleY, 0xffffff, 0.5);
      cloudGraphic.setDepth(0);
    });
  }

  createNPC() {
    if (this.npc) {
      this.npc.destroy();
    }

    const npcData = this.npcList[this.currentLevel - 1];

    this.npc = this.physics.add.sprite(npcData.x, npcData.y, null);
    this.npc.setVelocity(
      Phaser.Math.Between(-20, 20),
      Phaser.Math.Between(-10, 10)
    );
    this.npc.setBounce(1, 1);
    this.npc.setCollideWorldBounds(true);
    this.npc.setDepth(10);

    // Create NPC graphics based on level
    const npcGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    
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
    
    npcGraphics.generateTexture('npc', 30, 30);
    npcGraphics.destroy();

    this.npc.setTexture('npc');

    this.npcHelpPoint = new Phaser.Math.Vector2(npcData.x, npcData.y);
    this.helpProgress = 0;
    this.levelComplete = false;
    this.canTransitionToNextLevel = false;
  }

  update() {
    if (!this.player || this.levelComplete) return;

    // Player movement
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

    // For level 1, make the bird fall
    if (this.currentLevel === 1 && this.npc) {
      this.npc.setVelocityY(this.npc.body.velocity.y + 2); // Accelerate downward
      // Stop at ocean surface
      if (this.npc.y > 500) {
        this.npc.setVelocity(0, 0);
        this.npc.setPosition(750, 500);
      }
    }

    // Check distance to NPC
    if (this.player && this.npc) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.npc.x,
        this.npc.y
      );

      if (distance < this.helpRadius) {
        this.helpProgress += 1;

        // Emit healing particles
        if (this.particles) {
          this.particles.emitParticleAt(this.npc.x, this.npc.y, 5);
        }

        // Complete the level when help progress reaches threshold
        if (this.helpProgress > 300) {
          this.completeLevel();
        }
      } else {
        this.helpProgress = Math.max(0, this.helpProgress - 0.5);
      }
    }
  }

  completeLevel() {
    this.levelComplete = true;
    this.hearts += 1;

    if (this.onHeartEarned) {
      this.onHeartEarned(this.hearts, this.currentLevel);
    }

    // Visual feedback
    if (this.npc) {
      this.tweens.add({
        targets: this.npc,
        scale: 1.5,
        alpha: 0,
        duration: 500,
        ease: 'Quad.easeOut',
      });
    }

    // Setup for next level or game end
    if (this.currentLevel < 5) {
      this.time.delayedCall(5000, () => {
        this.nextLevel();
      });
    } else {
      this.time.delayedCall(5000, () => {
        if (this.onGameComplete) {
          this.onGameComplete();
        }
      });
    }
  }

  nextLevel() {
    this.currentLevel += 1;
    this.createNPC();
  }

  getHelpProgress(): number {
    return (this.helpProgress / 300) * 100;
  }

  getHearts(): number {
    return this.hearts;
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  getNPCInfo() {
    return this.npcList[this.currentLevel - 1];
  }
}

// Main Game Component
export default function SkyGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [hearts, setHearts] = useState(0);
  const [level, setLevel] = useState(1);
  const [helpProgress, setHelpProgress] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'complete'>('playing');
  const [currentNPC, setCurrentNPC] = useState<string>('');
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  const sceneRef = useRef<SkyGameScene | null>(null);

  const levelMessages: Record<number, string> = {
    1: 'You saved my life. Thank you so much!',
    2: 'You sure do know how to sweep someone off their feet! Thank you!',
    3: "I thought it was over, until you came through. You're my Saviour!",
    4: "If you ever need anything, I'm at your service.",
    5: "I can't believe you were able to keep me from drowning! Drinks on me!",
  };

  // Hide speech bubble after 3 seconds
  useEffect(() => {
    if (showSpeechBubble) {
      const timer = setTimeout(() => {
        setShowSpeechBubble(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSpeechBubble]);

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
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: SkyGameScene,
    };

    const phaserGame = new Phaser.Game(config);
    let updateInterval: NodeJS.Timeout;

    const handleGameReady = () => {
      const scene = phaserGame.scene.getScene('SkyGameScene') as SkyGameScene;
      if (scene) {
        sceneRef.current = scene;

        // Set up callbacks
        scene.onHeartEarned = (newHearts: number, completedLevel: number) => {
          setHearts(newHearts);
          // Show speech bubble with the message from the completed level
          setSpeechMessage(levelMessages[completedLevel] || '');
          setShowSpeechBubble(true);
        };

        scene.onGameComplete = () => {
          setGameState('complete');
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
    <main className="w-full h-screen bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-800 flex flex-col">
      {/* Header with stats */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-white/20 p-4">
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

          {/* Back to Home */}
          <Link
            href="/games/sky"
            className="px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded text-white font-semibold transition"
          >
            Back
          </Link>
        </div>
      </div>

      {/* Game Container */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
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
      </div>

      {/* Help Progress Bar and Info */}
      <div className="bg-black/40 backdrop-blur-sm border-t border-white/20 p-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-white/70 text-sm mb-2">Help Progress</p>
          <Progress value={helpProgress} className="bg-white/20" />
          <p className="text-white/50 text-xs mt-2">
            Get close to the character and help them recover!
          </p>
        </div>
      </div>

      {/* Game Complete Screen */}
      {gameState === 'complete' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Card className="bg-gradient-to-b from-yellow-100 to-yellow-50 p-8 max-w-md text-center shadow-2xl">
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-3xl font-bold text-yellow-900 mb-2">
              Amazing!
            </h2>
            <p className="text-lg text-yellow-700 mb-4">
              You've completed the Sky Challenge!
            </p>
            <p className="text-2xl font-bold text-yellow-600 mb-6">
              Total Hearts Earned: {hearts}/5
            </p>
            <div className="flex gap-4">
              <Link
                href="/games/sky/play"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-semibold rounded-lg hover:from-sky-300 hover:to-blue-400 transition"
              >
                Play Again
              </Link>
              <Link
                href="/"
                className="flex-1 px-6 py-3 bg-gray-400 text-white font-semibold rounded-lg hover:bg-gray-500 transition"
              >
                Home
              </Link>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
