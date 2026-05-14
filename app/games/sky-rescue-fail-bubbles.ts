import * as Phaser from 'phaser';

/** How long fail-feedback bubbles stay visible before the same rescue attempt respawns (no heart change). */
export const SKY_FAIL_FEEDBACK_MS = 5000;

export const SKY_BASE_FAIL_MESSAGES = [
  'They slipped past!',
  'No worries, your heart count stay\'s the same — You never fail until you stop trying!',
  'Get ready… another character in need is faaaaaalling!',
] as const;

export const SKY_CITY_FAIL_MESSAGES = [
  'Oh no!  They fell beyond the skyline!',
  'No hearts lost. If you heart\'s is in the right place, you can always try again!',
  'Just like real-life events, you\'ll get another chance to help someone',
] as const;

export const SKY_ISLANDS_FAIL_MESSAGES = [
  'They vanished below the sky islands!',
  'Hearts unchanged — because you never fail until you stop trying!',
  'Anticipate the drift on the next try.',
  'Wait for it… another opportunity to rescue is coming!',
] as const;

export const SKY_FORTRESS_FAIL_MESSAGES = [
  'No worries, your heart count still stands.',
  'Another chance incoming…',
] as const;

export const SKY_SURFING_FAIL_MESSAGES = [
  'The wind carried them away!',
  'Hearts unchanged — ride the next gust and try again!',
  'Another soul is drifting in… get ready to intercept!',
] as const;

/**
 * Stacked speech-style bubbles fixed to the camera (survives camera shake if added later).
 */
export function mountSkyFailBubbleMessages(
  scene: Phaser.Scene,
  messages: readonly string[],
): Phaser.GameObjects.Container {
  const cx = scene.scale.width / 2;
  const top = Math.min(140, scene.scale.height * 0.22);
  const root = scene.add.container(cx, top);
  root.setDepth(50_000);
  root.setScrollFactor(0);

  const spacing = 12;
  let nextTop = 0;

  for (let i = 0; i < messages.length; i++) {
    const body = scene.add.text(0, 0, messages[i], {
      fontFamily: 'system-ui, Segoe UI, sans-serif',
      fontSize: '14px',
      color: '#111827',
      align: 'center',
      wordWrap: { width: 236 },
    });
    body.setOrigin(0.5, 0);

    const padX = 16;
    const padY = 11;
    const bubbleW = Math.min(290, Math.max(body.width, 120) + padX * 2);
    const bubbleH = body.height + padY * 2;

    const row = scene.add.container(0, nextTop + bubbleH / 2);
    const bg = scene.add.graphics();
    bg.fillStyle(0xfff7ed, 0.98);
    bg.fillRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 14);
    bg.lineStyle(2, 0xea580c, 1);
    bg.strokeRoundedRect(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH, 14);

    body.setY(-body.height / 2);

    row.add([bg, body]);
    root.add(row);

    nextTop += bubbleH + spacing;
  }

  return root;
}
