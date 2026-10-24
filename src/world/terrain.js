import Phaser from 'phaser';

// Draws a set of line segments three times at increasing width/decreasing
// alpha with additive blending to fake a neon glow without relying on the
// WebGL-only FX pipeline.
export function drawGlowSegments(scene, segs, color, layers){
  const g = scene.add.graphics();
  g.setBlendMode(Phaser.BlendModes.ADD);
  layers.forEach((layer) => {
    g.lineStyle(layer.w, color, layer.a);
    g.beginPath();
    for (let i = 0; i < segs.length; i++){
      const s = segs[i];
      g.moveTo(s[0], s[1]);
      g.lineTo(s[2], s[3]);
    }
    g.strokePath();
  });
  return g;
}

export function drawWorldBoundary(scene, worldW, worldH, color){
  const g = scene.add.graphics();
  g.setBlendMode(Phaser.BlendModes.ADD);
  g.lineStyle(2, color, 0.6);
  g.strokeRect(1, 1, worldW - 2, worldH - 2);
  return g;
}

export function createPadBeacon(scene){
  const g = scene.add.graphics();
  g.setBlendMode(Phaser.BlendModes.ADD);
  return g;
}

export function updatePadBeacon(g, centerX, padY, halfWidth, color, t){
  const pulse = Math.sin(t * 2) * 0.3 + 0.7;
  const x1 = centerX - halfWidth, x2 = centerX + halfWidth;
  g.clear();
  g.setBlendMode(Phaser.BlendModes.ADD);
  g.lineStyle(5, color, 0.12 * pulse);
  g.lineBetween(x1, padY, x2, padY);
  g.lineStyle(2, color, 0.9);
  g.lineBetween(x1, padY, x2, padY);
}
