'use client';
import { useEffect } from 'react';
import Phaser from 'phaser';

export default function SeaGame() {
  useEffect(() => {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'phaser-container',
      scene: {
        preload() {
          console.log('Sea Phaser scene loaded');
        },
        create() {
          console.log('Sea Phaser scene created');
        },
      },
    };

    const game = new Phaser.Game(config);

    return () => {
      game.destroy(true);
    };
  }, []);

  return <div id="phaser-container" className="w-full h-screen" />;
}