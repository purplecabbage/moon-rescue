import Phaser from 'phaser';

export function createDotTexture(scene){
  if (scene.textures.exists('dot')) return;
  const pg = scene.make.graphics({ x: 0, y: 0, add: false });
  pg.fillStyle(0xffffff, 1);
  pg.fillCircle(8, 8, 8);
  pg.generateTexture('dot', 16, 16);
  pg.destroy();
}

export function spawnBurst(scene, list, x, y, n, colors, speedMin, speedMax, lifeMin, lifeMax){
  for (let i = 0; i < n; i++){
    const ang = Math.random() * Math.PI * 2;
    const spd = Phaser.Math.FloatBetween(speedMin, speedMax);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const img = scene.add.image(x, y, 'dot').setBlendMode(Phaser.BlendModes.ADD).setTint(color);
    img.setScale(Phaser.Math.FloatBetween(0.4, 1.1));
    list.push({
      img, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life: Phaser.Math.FloatBetween(lifeMin, lifeMax),
      maxLife: lifeMax
    });
  }
}

export function spawnDirected(scene, list, x, y, baseAngleRad, spreadDeg, colors, speedMin, speedMax, lifeMin, lifeMax, count = 1, scaleMul = 1){
  for (let i = 0; i < count; i++){
    const ang = baseAngleRad + Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-spreadDeg, spreadDeg));
    const spd = Phaser.Math.FloatBetween(speedMin, speedMax);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const img = scene.add.image(x, y, 'dot').setBlendMode(Phaser.BlendModes.ADD).setTint(color);
    img.setScale(Phaser.Math.FloatBetween(0.3, 0.7) * scaleMul);
    list.push({
      img, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life: Phaser.Math.FloatBetween(lifeMin, lifeMax),
      maxLife: lifeMax
    });
  }
}

export function updateParticles(list, dt){
  for (let i = list.length - 1; i >= 0; i--){
    const p = list[i];
    p.img.x += p.vx * dt;
    p.img.y += p.vy * dt;
    p.vx *= 0.96; p.vy *= 0.96;
    p.life -= dt;
    p.img.setAlpha(Math.max(0, p.life / p.maxLife));
    if (p.life <= 0){ p.img.destroy(); list.splice(i, 1); }
  }
}
