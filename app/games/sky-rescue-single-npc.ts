import type { Scene } from 'phaser';

/** Tags the one rescue NPC sprite so stray duplicates can be cleaned up. */
export const SKY_RESCUE_NPC_DATA_KEY = 'skyRescueNpc';

/**
 * Removes every rescue-NPC sprite except `keep` (typically the player).
 * Call at the start of createNPC before spawning the next drop.
 */
export function destroyTaggedRescueNpcs(
  scene: Scene,
  keep: Phaser.GameObjects.GameObject | null,
): void {
  const list = scene.children.list;
  for (let i = list.length - 1; i >= 0; i--) {
    const ch = list[i];
    if (!ch || ch === keep) continue;
    const sprite = ch as Phaser.Physics.Arcade.Sprite & {
      getData?: (key: string) => unknown;
      destroy?: () => void;
    };
    if (typeof sprite.getData === 'function' && sprite.getData(SKY_RESCUE_NPC_DATA_KEY)) {
      sprite.destroy?.();
    }
  }
}
