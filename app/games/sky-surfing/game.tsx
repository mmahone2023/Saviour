'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as Phaser from 'phaser';
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
  SKY_FAIL_FEEDBACK_MS,
  SKY_SURFING_FAIL_MESSAGES,
} from '@/app/games/sky-rescue-fail-bubbles';

const SPEECH_BUBBLE_RESCUE_MS = 10000;
const VICTORY_LOCK_HOVER_MESSAGE = 'After celebrating to the victory Anthem, you can choose your destiny!';

const MAX_LEVEL = 5;

class SkySurfingGameScene extends Phaser.Scene {
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
  private drownRestartScheduled: boolean = false;
  private drownFailTimer: Phaser.Time.TimerEvent | null = null;
  private inVictorySequence: boolean = false;
  private failBubbleLayer: Phaser.GameObjects.Container | null = null;
  private victoryAdvanceSeq: number = 0;
  private rescueAdvanceSeq: number = 0;
  private lastVictoryHandledSeq: number = -999;
  private currentSpeed: number = 90;
  private isPaused: boolean = false;
  private hasExitedBounds: boolean = false;
  private pauseText: Phaser.GameObjects.Text | null = null;
  private npcSpawnTime: number = 0;
  private clouds: Phaser.GameObjects.Container[] = [];
  private npcsToSaveThisLevel: number = 1;
  private npcsSavedThisLevel: number = 0;
  private npcsSpawnedThisLevel: number = 0;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private carriedNpcs: Phaser.Physics.Arcade.Sprite[] = [];
  private allCollected: boolean = false;

  private levelMessages: Record<number, string> = {
    1: 'You caught me before the wind took me away!',
    2: 'I was swept off my feet — literally! Thank you!',
    3: "The wind almost carried me off the edge! You're my hero!",
    4: 'I thought I was gone for good! You saved me!',
    5: 'You are the ultimate air surfer and rescuer!',
  };

  private npcList: Array<{
    name: string;
    description: string;
  }> = [
    { name: '🪁 Kite Flyer', description: 'Save the kite flyer swept by the wind' },
    { name: '🎈 Balloon Kid', description: 'Rescue the child carried by balloons' },
    { name: '🦜 Parrot Keeper', description: 'Help the parrot keeper blown off course' },
    { name: '🪂 Parachutist', description: 'Save the parachutist caught in a gust' },
    { name: '🌬️ Wind Dancer', description: 'Rescue the wind dancer drifting away' },
  ];

  onHeartEarned: ((hearts: number, level: number) => void) | null = null;
  onGameComplete: (() => void) | null = null;
  onPauseStateChange: ((isPaused: boolean) => void) | null = null;
  onArrowDisabledNudge: ((message: string) => void) | null = null;
  private skyArrowChallenge: SkyArrowChallengeState = createSkyArrowChallengeState();

  constructor() {
    super('SkySurfingGameScene');
  }

  preload() {}

  create() {
    const roundData = this.registry.get('skySurfingRound') || { roundNumber: 1, baseSpeed: 90 };
    this.currentSpeed = roundData.baseSpeed;

    this.currentLevel = 1;
    this.hearts = 0;
    this.lastVictoryHandledSeq = -999;
    this.inVictorySequence = false;
    this.drownFailTimer = null;
    this.failBubbleLayer = null;
    this.npcsToSaveThisLevel = 1;
    this.npcsSavedThisLevel = 0;

    this.cameras.main.setBackgroundColor(0x6ec6ff);

    this.createBackground();
    this.createPlayerTexture();

    this.player = this.physics.add.sprite(100, 300, 'player');
    this.player.setCollideWorldBounds(true);

    try {
      this.particles = this.add.particles(0xffd700);
      this.particles.stop();
    } catch {
      this.particles = null;
    }

    this.createWindEffect();

    this.cursors = this.input.keyboard?.createCursorKeys() || null;

    this.input.keyboard?.on('keydown-SPACE', () => {
      this.togglePause();
    });

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

    this.skyArrowChallenge = createSkyArrowChallengeState();

    this.createNPC();
  }

  private createBackground() {
    const g = this.add.graphics();
    g.fillStyle(0x87ceeb, 1);
    g.fillRect(0, 0, 800, 150);
    g.fillStyle(0x7ec8e3, 1);
    g.fillRect(0, 150, 800, 150);
    g.fillStyle(0x6bb7d8, 1);
    g.fillRect(0, 300, 800, 150);
    g.fillStyle(0x5aa8cc, 1);
    g.fillRect(0, 450, 800, 150);
    g.setDepth(-20);

    this.clouds = [];
    for (let i = 0; i < 10; i++) {
      const cx = Phaser.Math.Between(0, 800);
      const cy = Phaser.Math.Between(30, 560);
      const scale = Phaser.Math.FloatBetween(0.6, 1.3);
      const alpha = Phaser.Math.FloatBetween(0.35, 0.6);

      const cloudGfx = this.add.graphics();
      cloudGfx.fillStyle(0xffffff, alpha);
      cloudGfx.fillRoundedRect(-35 * scale, -12 * scale, 70 * scale, 24 * scale, 12 * scale);
      cloudGfx.fillRoundedRect(-45 * scale, -4 * scale, 40 * scale, 18 * scale, 9 * scale);
      cloudGfx.fillRoundedRect(10 * scale, -4 * scale, 40 * scale, 18 * scale, 9 * scale);
      cloudGfx.fillRoundedRect(-10 * scale, -16 * scale, 30 * scale, 16 * scale, 8 * scale);
      cloudGfx.fillCircle(20 * scale, -6 * scale, 10 * scale);
      cloudGfx.fillCircle(-20 * scale, -2 * scale, 8 * scale);

      const container = this.add.container(cx, cy, [cloudGfx]);
      container.setDepth(-15);
      this.clouds.push(container);
    }
  }

  private windStreaks: Phaser.GameObjects.Rectangle[] = [];

  private createWindEffect() {
    this.windStreaks = [];
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, 800);
      const y = Phaser.Math.Between(0, 600);
      const w = Phaser.Math.Between(20, 60);
      const streak = this.add.rectangle(x, y, w, 1.5, 0xffffff, 0.3);
      streak.setDepth(-5);
      streak.setData('speed', Phaser.Math.Between(3, 7));
      this.windStreaks.push(streak);
    }
  }

  private createPlayerTexture() {
    const playerGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    playerGraphics.fillStyle(0xe0432b, 1);
    playerGraphics.beginPath();
    playerGraphics.moveTo(18, 12);
    playerGraphics.lineTo(8, 32);
    playerGraphics.lineTo(28, 32);
    playerGraphics.closePath();
    playerGraphics.fillPath();

    playerGraphics.fillStyle(0xf2b53a, 1);
    playerGraphics.fillRoundedRect(14, 15, 8, 14, 3);

    playerGraphics.fillStyle(0xb6251d, 1);
    playerGraphics.fillCircle(18, 22, 4);
    playerGraphics.fillStyle(0xfde68a, 1);
    playerGraphics.fillRect(16, 20, 4, 1.2);
    playerGraphics.fillRect(16, 22, 4, 1.2);
    playerGraphics.fillRect(16, 24, 4, 1.2);
    playerGraphics.fillRect(16, 20, 1.2, 3);
    playerGraphics.fillRect(18.8, 22, 1.2, 3);

    playerGraphics.fillStyle(0xf2b48c, 1);
    playerGraphics.fillCircle(18, 9.5, 4.5);

    playerGraphics.fillStyle(0xd78a21, 1);
    playerGraphics.beginPath();
    playerGraphics.moveTo(13, 10);
    playerGraphics.lineTo(14, 4);
    playerGraphics.lineTo(18, 2.5);
    playerGraphics.lineTo(22, 4);
    playerGraphics.lineTo(23, 10);
    playerGraphics.closePath();
    playerGraphics.fillPath();
    playerGraphics.fillStyle(0xf6d365, 1);
    playerGraphics.fillTriangle(14, 5.5, 12.4, 1.2, 14.8, 5.4);
    playerGraphics.fillTriangle(22, 5.5, 23.6, 1.2, 21.2, 5.4);

    playerGraphics.fillStyle(0x3f2a1f, 1);
    playerGraphics.fillRect(15.2, 8.3, 1.7, 0.55);
    playerGraphics.fillRect(19.1, 8.3, 1.7, 0.55);
    playerGraphics.fillStyle(0xffffff, 1);
    playerGraphics.fillCircle(16.2, 9.5, 0.75);
    playerGraphics.fillCircle(19.8, 9.5, 0.75);
    playerGraphics.fillStyle(0x2a211b, 1);
    playerGraphics.fillCircle(16.2, 9.5, 0.35);
    playerGraphics.fillCircle(19.8, 9.5, 0.35);
    playerGraphics.lineStyle(1, 0x8b5a3c);
    playerGraphics.beginPath();
    playerGraphics.moveTo(18, 10);
    playerGraphics.lineTo(17.8, 11.2);
    playerGraphics.strokePath();
    playerGraphics.lineStyle(1, 0x7a2f22);
    playerGraphics.beginPath();
    playerGraphics.moveTo(16.6, 12.1);
    playerGraphics.lineTo(19.4, 12.1);
    playerGraphics.strokePath();

    playerGraphics.lineStyle(2, 0xf2b53a);
    playerGraphics.beginPath();
    playerGraphics.moveTo(14, 19);
    playerGraphics.lineTo(9, 25);
    playerGraphics.strokePath();
    playerGraphics.beginPath();
    playerGraphics.moveTo(22, 19);
    playerGraphics.lineTo(27, 25);
    playerGraphics.strokePath();

    playerGraphics.lineStyle(2, 0xd98b24);
    playerGraphics.beginPath();
    playerGraphics.moveTo(16, 29);
    playerGraphics.lineTo(14, 38);
    playerGraphics.strokePath();
    playerGraphics.beginPath();
    playerGraphics.moveTo(20, 29);
    playerGraphics.lineTo(22, 38);
    playerGraphics.strokePath();

    playerGraphics.generateTexture('player', 36, 42);
    playerGraphics.destroy();
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

  private startLevelWave() {
    this.cancelPendingDrownRestart();
    destroyTaggedRescueNpcs(this, this.player);
    if (this.npc) {
      this.npc.destroy();
      this.npc = null;
    }
    if (this.spawnTimer) {
      this.time.removeEvent(this.spawnTimer);
      this.spawnTimer = null;
    }

    this.npcsSavedThisLevel = 0;
    this.npcsSpawnedThisLevel = 0;
    this.carriedNpcs = [];
    this.allCollected = false;
    this.levelComplete = false;
    this.isCarrying = false;
    this.npcHasBeenTouched = false;
    this.hasExitedBounds = false;
    this.inVictorySequence = false;

    this.spawnOneNPC();

    if (this.npcsToSaveThisLevel > 1) {
      this.spawnTimer = this.time.addEvent({
        delay: 2000,
        callback: () => {
          if (this.npcsSpawnedThisLevel < this.npcsToSaveThisLevel) {
            this.spawnOneNPC();
          }
        },
        repeat: this.npcsToSaveThisLevel - 2,
      });
    }
  }

  private spawnOneNPC() {
    const lvl = Math.min(MAX_LEVEL, Math.max(1, this.currentLevel));
    const npcTexKey = `npcSurfing_${lvl}_${this.npcsSpawnedThisLevel}_${Date.now()}`;

    const npcGraphics = this.make.graphics({ x: 0, y: 0 }, false);
    npcGraphics.fillStyle(0xff6347, 1);
    npcGraphics.fillCircle(15, 15, 8);
    npcGraphics.fillStyle(0xff7f50, 1);
    npcGraphics.fillCircle(15, 8, 5);
    npcGraphics.generateTexture(npcTexKey, 30, 30);
    npcGraphics.destroy();

    const spawnX = Phaser.Math.Between(750, 850);
    const spawnY = Phaser.Math.Between(80, 520);

    const sprite = this.physics.add.sprite(spawnX, spawnY, npcTexKey);

    const speed = this.currentSpeed + (lvl - 1) * 12;
    const windAngleDeg = Phaser.Math.Between(-15, 15);
    const angleRad = windAngleDeg * Math.PI / 180;

    const vx = -speed * Math.cos(angleRad);
    const vy = speed * Math.sin(angleRad);

    sprite.setVelocity(vx, vy);
    sprite.setCollideWorldBounds(false);
    sprite.setDepth(10);
    sprite.setData(SKY_RESCUE_NPC_DATA_KEY, true);
    sprite.setData('baseVx', vx);
    sprite.setData('baseVy', vy);
    sprite.setData('spawnTime', this.time.now);
    sprite.setData('touched', false);

    this.npcsSpawnedThisLevel += 1;

    if (!this.npc) {
      this.npc = sprite;
      this.baseVelocity = { x: vx, y: vy };
      this.npcSpawnTime = this.time.now;
      this.npcHasBeenTouched = false;
    }
  }

  createNPC() {
    this.startLevelWave();
  }

  private updatePauseText() {
    if (this.pauseText) {
      this.pauseText.setVisible(true);
    }
  }

  update() {
    if (!this.player) return;

    tickSkyArrowChallenge(
      this.time.now,
      this.isPaused,
      this.skyArrowChallenge,
      this.cursors,
      skyArrowDisabledMessageIndexForLevel(this.currentLevel),
      (message) => this.onArrowDisabledNudge?.(message),
    );

    if (this.isPaused) {
      return;
    }

    for (const cloud of this.clouds) {
      cloud.x -= 0.4;
      if (cloud.x < -100) {
        cloud.x = 900;
        cloud.y = Phaser.Math.Between(30, 560);
      }
    }

    for (const streak of this.windStreaks) {
      streak.x -= streak.getData('speed') as number;
      if (streak.x < -70) {
        streak.x = 870;
        streak.y = Phaser.Math.Between(0, 600);
      }
    }

    const speed = 300;
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

    // After the last rescue, Saviour rises automatically (same beat as other sky games' fly-off).
    if (this.allCollected) {
      this.player.setVelocityY(-speed);
    }

    // Position carried NPCs around Saviour
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    for (let i = 0; i < this.carriedNpcs.length; i++) {
      const carried = this.carriedNpcs[i];
      if (!carried || !carried.active) continue;
      const offsetY = -30 - i * 18;
      carried.setPosition(this.player.x, this.player.y + offsetY);
      carried.setVelocity(body.velocity.x, body.velocity.y);
    }

    // If all collected → Saviour flies up; heart and HUD update only after clearing the top (see completeRescueAfterFloat).
    if (this.allCollected) {
      const v = this.cameras.main.worldView;
      const pad = 40;
      if (!this.hasExitedBounds && this.player.y < v.y - pad) {
        this.hasExitedBounds = true;
        this.completeRescueAfterFloat();
      }
      return;
    }

    // Check all free-flying NPCs
    const freeNpcs = this.children.list.filter((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite & { getData?: (key: string) => unknown };
      if (!sprite || !sprite.active) return false;
      if (typeof sprite.getData !== 'function') return false;
      if (!sprite.getData(SKY_RESCUE_NPC_DATA_KEY)) return false;
      if (sprite.getData('touched')) return false;
      return true;
    }) as Phaser.Physics.Arcade.Sprite[];

    for (const npcSprite of freeNpcs) {
      const spawnT = (npcSprite.getData('spawnTime') as number) || this.time.now;
      const elapsed = this.time.now - spawnT;
      const bobAmplitude = 30 + this.currentLevel * 5;
      const bobFrequency = 0.002 + this.currentLevel * 0.0003;
      const windBob = Math.sin(elapsed * bobFrequency) * bobAmplitude;
      const gustX = Math.sin(elapsed * 0.001) * 8;

      const bvx = (npcSprite.getData('baseVx') as number) || -90;
      const bvy = (npcSprite.getData('baseVy') as number) || 0;

      npcSprite.setVelocity(bvx + gustX, bvy + windBob * 0.03);
      npcSprite.y += Math.sin(elapsed * bobFrequency) * 0.4;

      // Fail: blown off left edge
      if (
        npcSprite.x < -40 &&
        !this.drownRestartScheduled &&
        !this.inVictorySequence
      ) {
        this.drownRestartScheduled = true;
        if (!this.failBubbleLayer) {
          this.failBubbleLayer = mountSkyFailBubbleMessages(this, SKY_SURFING_FAIL_MESSAGES);
        }
        this.drownFailTimer = this.time.delayedCall(SKY_FAIL_FEEDBACK_MS, () => {
          this.drownFailTimer = null;
          if (this.failBubbleLayer) {
            this.failBubbleLayer.destroy(true);
            this.failBubbleLayer = null;
          }
          this.drownRestartScheduled = false;
          this.restartLevel();
        });
        return;
      }

      // Pickup check
      if (this.player) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          npcSprite.x, npcSprite.y
        );

        if (distance < this.helpRadius) {
          this.cancelPendingDrownRestart();
          npcSprite.setData('touched', true);
          npcSprite.setVelocity(0, 0);
          this.carriedNpcs.push(npcSprite);
          this.npcsSavedThisLevel += 1;

          if (this.particles) {
            this.particles.emitParticleAt(npcSprite.x, npcSprite.y, 10);
          }

          // Check if all NPCs for this level are now collected
          if (this.npcsSavedThisLevel >= this.npcsToSaveThisLevel) {
            this.allCollected = true;
            this.isCarrying = true;
            this.hasExitedBounds = false;
            this.player.setCollideWorldBounds(false);

            this.beginRescueCelebration();
          }
          break;
        }
      }
    }
  }

  private beginRescueCelebration(): void {
    this.cancelPendingDrownRestart();
    this.levelComplete = true;
    this.inVictorySequence = true;
    this.rescueAdvanceSeq = ++this.victoryAdvanceSeq;
  }

  private completeRescueAfterFloat(): void {
    const seq = this.rescueAdvanceSeq;
    if (seq !== this.victoryAdvanceSeq) return;
    if (this.lastVictoryHandledSeq === seq) return;
    this.lastVictoryHandledSeq = seq;

    for (const c of this.carriedNpcs) {
      if (c && c.active) c.destroy();
    }
    this.carriedNpcs = [];
    this.npc = null;
    this.isCarrying = false;
    this.allCollected = false;
    this.hasExitedBounds = false;

    this.hearts = Math.min(MAX_LEVEL, this.hearts + 1);
    if (this.onHeartEarned) {
      this.onHeartEarned(this.hearts, Math.min(MAX_LEVEL, this.currentLevel));
    }
    if (this.hearts === 1) {
      notifySkyArrowFirstRescue(this.skyArrowChallenge, this.time.now);
    }

    const cx = this.cameras.main.width / 2;
    const resetY = this.cameras.main.height * 0.75;

    this.player?.setPosition(cx, resetY);
    this.player?.setVelocity(0, 0);

    this.levelComplete = false;
    this.inVictorySequence = false;
    this.player?.setCollideWorldBounds(true);
    if (this.player?.body) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.checkCollision.up = true;
    }

    if (this.currentLevel < MAX_LEVEL) {
      this.nextLevel();
    } else if (this.onGameComplete) {
      this.onGameComplete();
    }
  }

  private restartLevel(): void {
    for (const c of this.carriedNpcs) {
      if (c && c.active) c.destroy();
    }
    this.carriedNpcs = [];
    this.allCollected = false;
    this.isCarrying = false;
    this.startLevelWave();
  }

  nextLevel() {
    if (this.currentLevel >= MAX_LEVEL) return;
    this.currentLevel += 1;
    this.npcsToSaveThisLevel = this.currentLevel;
    this.startLevelWave();
  }

  togglePause() {
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.physics.pause();
      this.updatePauseText();
    } else {
      this.physics.resume();
      if (this.pauseText) {
        this.pauseText.setVisible(false);
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
export default function SkySurfingGame() {
  const router = useRouter();
  const gameRef = useRef<HTMLDivElement>(null);
  const [, setGame] = useState<Phaser.Game | null>(null);
  const [hearts, setHearts] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'complete'>('playing');
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [speechMessage, setSpeechMessage] = useState('');
  const [speechBubbleIsArrowLockout, setSpeechBubbleIsArrowLockout] = useState(false);
  const [isAnthemPlaying, setIsAnthemPlaying] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const sceneRef = useRef<SkySurfingGameScene | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);

  const levelMessages: Record<number, string> = {
    1: 'You caught me before the wind took me away!',
    2: 'I was swept off my feet — literally! Thank you!',
    3: "The wind almost carried me off the edge! You're my hero!",
    4: 'I thought I was gone for good! You saved me!',
    5: 'You are the ultimate air surfer and rescuer!',
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
    if (gameState !== 'complete') return;
    const audio = new Audio('/audio/saviour.wav');
    victoryAudioRef.current = audio;
    setIsAnthemPlaying(true);
    const finishPlayback = () => {
      setIsAnthemPlaying(false);
      if (victoryAudioRef.current === audio) {
        victoryAudioRef.current = null;
      }
    };
    audio.addEventListener('ended', finishPlayback);
    audio.addEventListener('error', finishPlayback);
    void audio.play().catch(() => finishPlayback());
    return () => {
      audio.removeEventListener('ended', finishPlayback);
      audio.removeEventListener('error', finishPlayback);
      audio.pause();
      audio.currentTime = 0;
      if (victoryAudioRef.current === audio) {
        victoryAudioRef.current = null;
      }
      setIsAnthemPlaying(false);
    };
  }, [gameState]);

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
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      audio: {
        disableWebAudio: false,
      },
      scene: SkySurfingGameScene,
    };

    const phaserGame = new Phaser.Game(config);
    let updateInterval: NodeJS.Timeout;

    const handleGameReady = () => {
      const scene = phaserGame.scene.getScene('SkySurfingGameScene') as SkySurfingGameScene;
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
            setHearts(sceneRef.current.getHearts());
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
    <main className="relative w-full h-screen bg-gradient-to-b from-cyan-400 via-sky-500 to-blue-700 flex flex-col">
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
                <Link
                  href="/games/sky-surfing/play"
                  className="block w-full text-left px-4 py-3 text-white hover:bg-white/10 transition border-b border-white/10 cursor-pointer"
                >
                  🏄 Air Surfing (Current)
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
          <p className="text-white/70 text-sm mb-2">Surf the Air!</p>
          <p className="text-white/50 text-sm">
            Characters are being blown across the sky by strong winds! Use arrow keys to intercept them before they drift
            off the left edge. Space bar to pause. After you save everyone, fly up off the top to finish the wave,
            reset, and earn one heart — collect all five hearts to complete the run.
          </p>
        </div>
      </div>

      {gameState === 'complete' && (
        <SkyGameCompletionCard
          completedPhrase="Air Surfing!"
          hearts={hearts}
          tagline="You've mastered the winds!"
          actionsDisabled={isAnthemPlaying}
          disabledHoverMessage={VICTORY_LOCK_HOVER_MESSAGE}
          actions={
            <>
              <button
                type="button"
                disabled={isAnthemPlaying}
                onClick={() => {
                  if (isAnthemPlaying) return;
                  window.location.assign('/games/sky-surfing/play');
                }}
                className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Ride Again
              </button>
              <button
                type="button"
                disabled={isAnthemPlaying}
                onClick={() => {
                  if (isAnthemPlaying) return;
                  router.push('/');
                }}
                className="flex-1 rounded-lg border-2 border-slate-400 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Back Home
              </button>
            </>
          }
        />
      )}
    </main>
  );
}
