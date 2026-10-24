import Phaser from 'phaser';
import { getLevel } from '../levels.js';
import { loadLevelWorld } from '../world/levelLoader.js';
import { drawGlowSegments, drawWorldBoundary, createPadBeacon, updatePadBeacon } from '../world/terrain.js';
import { createRocket, LEFT_PORT, RIGHT_PORT } from '../entities/rocket.js';
import { createSurvivor, updateSurvivorPulse, destroySurvivor, ejectSurvivor, updateSurvivorFall, tickPickupCooldown, setVisualPosition } from '../entities/survivor.js';
import { createFuelPickup, updateFuelPickupPulse, destroyFuelPickup } from '../entities/fuelPickup.js';
import { createDotTexture, spawnBurst, spawnDirected, updateParticles } from '../entities/particles.js';
import { sfx } from '../audio/soundfx.js';
import * as hud from '../ui/hud.js';
import { initTunePanel } from '../ui/tunePanel.js';
import { COLD, COLD_DIM, HOT, HOT_AMBER, HOT_WHITE } from '../theme.js';

const ROCKET_PROBE = 13;
const PICKUP_RADIUS = 30;
const EXPLOSION_PAUSE_MS = 1300;
const MIN_MINER_SEPARATION = 30;

export class GameScene extends Phaser.Scene {
  constructor(){ super('game'); }

  init(data){
    this.levelId = data && data.levelId;
    this.levelData = data && data.levelData;
  }

  create(){
    const level = this.levelData || getLevel(this.levelId);
    this.level = level;
    hud.setLevelInfo(level);

    this.cameras.main.setBackgroundColor('#040406');
    const world = loadLevelWorld(level);
    this.world = world;
    this.physics.world.setBounds(0, 0, world.worldW, world.worldH);
    this.physics.world.gravity.y = 0; // enabled on launch, see btn-launch handler below

    drawWorldBoundary(this, world.worldW, world.worldH, COLD_DIM);
    drawGlowSegments(this, world.wallSegs, COLD, [
      { w: 7, a: 0.08 }, { w: 3.5, a: 0.18 }, { w: 1.3, a: 1 }
    ]);

    this.add.text(world.startX, world.homeY - 34, 'BASE', {
      fontFamily: '"Share Tech Mono",monospace', fontSize: '13px', color: '#fff2df'
    }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85);
    this.padBeacon = createPadBeacon(this);

    this.miners = world.miners.map((m) => createSurvivor(this, m.x, m.y));
    this.fuelPickups = world.fuelPickups.map((f) => createFuelPickup(this, f.x, f.y, f.amount));

    createDotTexture(this);
    this.particles = [];

    const rocket = createRocket(this, world.startX, world.startY);
    this.rocketBody = rocket.zone;
    this.rocketGfx = rocket.gfx;
    this.leftThrustGfx = rocket.leftThrustGfx;
    this.rightThrustGfx = rocket.rightThrustGfx;
    this.centerThrustGfx = rocket.centerThrustGfx;
    this.rocketAngle = 0;

    this.cameras.main.setBounds(0, 0, world.worldW, world.worldH);
    this.cameras.main.startFollow(this.rocketBody, true, 0.08, 0.08);

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', a: 'A', d: 'D', w: 'W', space: 'SPACE'
    });
    this.touch = { left: false, right: false, thrust: false };
    hud.bindTouch('touch-left', this.touch, 'left');
    hud.bindTouch('touch-right', this.touch, 'right');
    hud.bindTouch('touch-thrust', this.touch, 'thrust');

    this.fuel = level.fuelMax;
    this.shield = level.shieldMax;
    this.lives = level.lives;
    this.carried = 0;
    this.rescuedTotal = 0;
    // The win target: starts equal to the level's miner count, but drops
    // whenever one is permanently lost (fell too far) — otherwise a death
    // makes the mission silently unwinnable, since the lost miner can never
    // be rescued to make up the original total.
    this.totalMiners = world.miners.length;
    this.landed = false;
    this.onSurface = false;
    this.started = false;
    this.ended = false;
    this.lowFuelWarned = 0;
    this._wasThrusting = false;
    this._wasLeftThrusting = false;
    this._wasRightThrusting = false;
    this._pausedForTuning = false;
    this._stranded = false;
    this._strandedEjected = false;
    this._exploding = false;

    hud.updateLivesHud(this.lives);
    hud.updateRescuedCount(0);
    hud.updateFuelBar(this.fuel, level.fuelMax);
    hud.updateShieldBar(this.shield, level.shieldMax);
    initTunePanel(this);

    const self = this;
    document.getElementById('btn-launch').onclick = () => {
      hud.hidePanel('panel-intro');
      hud.showPanel('hud');
      sfx.init(level.audio);
      self.started = true;
      self.physics.world.gravity.y = level.gravity;
      self.rocketBody.body.setAllowGravity(true);
      self.rocketBody.body.velocity.set(0, level.startFallSpeed);
      hud.showMessage('FALLING — BRAKE FOR LANDING');
      self.msgTimer = 2.2;
    };
    document.getElementById('btn-restart').onclick = () => {
      hud.hidePanel('panel-end');
      hud.showPanel('panel-intro');
      hud.hidePanel('hud');
      self.scene.restart({ levelId: self.levelId, levelData: self.levelData });
    };
  }

  isSolid(r, c){
    const { grid, rows, cols } = this.world;
    if (r < 0) return false;
    if (r >= rows || c < 0 || c >= cols) return true;
    return grid[r][c];
  }

  showMessage(text, seconds = 1.8){
    hud.showMessage(text);
    this.msgTimer = seconds;
  }

  takeDamage(amount){
    if (amount <= 0) return;
    this.shield -= amount;
    hud.flashDamage();
    if (this.shield <= 0){
      this.loseLife();
    } else {
      sfx.thud();
      this.cameras.main.shake(120, 0.004);
      this.showMessage('SHIELD ' + Math.max(0, Math.round(this.shield)) + '%');
    }
  }

  // Carried miners pop out with a little outward hop, then fall (see
  // updateSurvivorFall in the main loop) until they land on a floor below —
  // or, if there isn't one within the fall time limit, are lost. Angles are
  // spread evenly (with a little jitter) rather than fully random, so a
  // multi-miner eject doesn't send them all down roughly the same spot.
  ejectCarriedMiners(){
    const n = this.carried;
    for (let i = 0; i < n; i++){
      const s = createSurvivor(this, this.rocketBody.x, this.rocketBody.y);
      const angle = (i / n) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      ejectSurvivor(s, angle);
      this.miners.push(s);
    }
    this.carried = 0;
  }

  // Miners never rest on top of each other — if one lands too close to an
  // already-resting miner, nudge it away until there's a clear gap. Looped:
  // a short flight (floor right below the start point) barely spreads
  // ejected miners out at all, so more than one can need pushing, and a
  // single pass can shove one conflict straight into another.
  separateFromOtherMiners(m){
    for (let pass = 0; pass < 4; pass++){
      let moved = false;
      for (let j = 0; j < this.miners.length; j++){
        const other = this.miners[j];
        if (other === m || other.falling) continue;
        const dx = m.x - other.x, dy = m.y - other.y;
        const dist = Math.hypot(dx, dy);
        if (dist >= MIN_MINER_SEPARATION) continue;
        moved = true;
        if (dist < 0.01) m.x += MIN_MINER_SEPARATION;
        else { const push = MIN_MINER_SEPARATION - dist; m.x += (dx / dist) * push; m.y += (dy / dist) * push; }
      }
      if (!moved) break;
    }
    setVisualPosition(m);
  }

  // Plays out the crash: freeze control and the wreck in place, eject
  // whoever's aboard and let them fall, then after the animation has had
  // time to actually be seen, hand off to the next life (or end the run).
  loseLife(){
    if (this._exploding) return;
    this._exploding = true;
    const level = this.level, world = this.world;
    sfx.stopAllThrust();
    this._wasThrusting = false;
    this._wasLeftThrusting = false;
    this._wasRightThrusting = false;
    sfx.crash();
    this.cameras.main.shake(260, 0.012);
    spawnBurst(this, this.particles, this.rocketBody.x, this.rocketBody.y, 46, [HOT, HOT_AMBER, HOT_WHITE], 40, 220, 0.5, 1.0);
    this.ejectCarriedMiners();
    this.started = false;
    this.rocketBody.body.setVelocity(0, 0);
    this.rocketBody.body.setAllowGravity(false);
    this.rocketGfx.setVisible(false);
    this.leftThrustGfx.setVisible(false);
    this.rightThrustGfx.setVisible(false);
    this.centerThrustGfx.setVisible(false);

    this.time.delayedCall(EXPLOSION_PAUSE_MS, () => {
      this._exploding = false;
      this.lives--;
      hud.updateLivesHud(this.lives);
      if (this.lives <= 0){ this.endGame(false); return; }
      this.showMessage('HULL BREACH — RESPAWNING AT BASE');
      this.rocketBody.body.reset(world.startX, world.homeY - 40);
      this.rocketAngle = 0;
      this.fuel = Math.max(this.fuel, level.fuelMax * 0.45);
      this.shield = level.shieldMax;
      this._stranded = false;
      this._strandedEjected = false;
      this.rocketBody.body.setAllowGravity(true);
      this.rocketGfx.setVisible(true);
      this.started = true;
    });
  }

  endGame(won){
    this.ended = true;
    sfx.stopAllThrust();
    hud.hidePanel('hud');
    const title = document.getElementById('end-title');
    const stats = document.getElementById('end-stats');
    const lost = this.world.miners.length - this.totalMiners;
    if (won){
      title.textContent = lost > 0 ? 'MISSION COMPLETE' : 'ALL MINERS RECOVERED';
      sfx.victory();
    } else {
      title.textContent = 'MISSION LOST';
      sfx.crash();
    }
    stats.innerHTML = 'RESCUED <span class="big">' + this.rescuedTotal + '</span> / ' + this.world.miners.length +
      (lost > 0 ? ' (' + lost + ' lost)' : '') +
      '<br>HULL INTEGRITY ' + Math.max(0, this.lives) + ' / ' + this.level.lives;
    hud.showPanel('panel-end');
  }

  update(time, delta){
    const dt = Math.min(delta / 1000, 0.033);
    const t = time / 1000;
    const level = this.level, world = this.world;

    for (let i = this.miners.length - 1; i >= 0; i--){
      const m = this.miners[i];
      updateSurvivorPulse(m, t);
      tickPickupCooldown(m, dt);
      const outcome = updateSurvivorFall(m, dt, level.gravity, (r, c) => this.isSolid(r, c), world.cellSize, level.minerFallLimit);
      if (outcome === 'died'){
        sfx.minerLost();
        this.showMessage('A MINER WAS LOST');
        destroySurvivor(m);
        this.miners.splice(i, 1);
        this.totalMiners--;
        hud.updateTotalCount(this.totalMiners);
        // A death can resolve the mission on its own: if that was the last
        // rescuable miner and you'd already delivered everyone else, the
        // target just dropped to meet what you've already done. And if
        // nobody was ever rescued and there's now nobody left to rescue,
        // that's a loss, not a vacuous win.
        if (!this.ended){
          if (this.totalMiners <= 0 && this.rescuedTotal <= 0) this.endGame(false);
          else if (this.rescuedTotal >= this.totalMiners) this.endGame(true);
        }
      } else if (outcome === 'landed'){
        this.separateFromOtherMiners(m);
      }
    }
    for (let i = 0; i < this.fuelPickups.length; i++) updateFuelPickupPulse(this.fuelPickups[i], t);
    updatePadBeacon(this.padBeacon, world.startX, world.homeY, world.cellSize * 2.5, COLD, t);

    if (!this.started || this.ended){
      updateParticles(this.particles, dt);
      return;
    }

    this.physics.world.gravity.y = level.gravity;

    const left = this.keys.left.isDown || this.keys.a.isDown || this.touch.left;
    const right = this.keys.right.isDown || this.keys.d.isDown || this.touch.right;
    const thrust = this.keys.up.isDown || this.keys.w.isDown || this.keys.space.isDown || this.touch.thrust;

    if (left) this.rocketAngle -= level.rotSpeed * dt;
    if (right) this.rocketAngle += level.rotSpeed * dt;

    const body = this.rocketBody.body;
    const thrusting = thrust && this.fuel > 0;
    if (thrusting){
      const rad = Phaser.Math.DegToRad(this.rocketAngle - 90);
      body.velocity.x += Math.cos(rad) * level.thrustAccel * dt;
      body.velocity.y += Math.sin(rad) * level.thrustAccel * dt;
      this.fuel = Math.max(0, this.fuel - level.fuelBurn * dt);
      if (!this._wasThrusting) sfx.thrustStart();
      const tailRad = Phaser.Math.DegToRad(this.rocketAngle + 90);
      const tailX = this.rocketBody.x + Math.cos(tailRad) * 16;
      const tailY = this.rocketBody.y + Math.sin(tailRad) * 16;
      spawnDirected(this, this.particles, tailX, tailY, tailRad, 18, [HOT, HOT_AMBER], 70, 160, 0.25, 0.45, 2);
    } else if (this._wasThrusting){
      sfx.thrustStop();
    }
    this._wasThrusting = thrusting;

    // RCS puffs at the actual port positions — quieter sound, smaller burn
    // trail than the main engine. Rotation is always free (no fuel check),
    // so these fire purely off the raw left/right input.
    const rad = Phaser.Math.DegToRad(this.rocketAngle);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const toWorld = ([lx, ly]) => ({
      x: this.rocketBody.x + lx * cos - ly * sin,
      y: this.rocketBody.y + lx * sin + ly * cos
    });
    if (right){
      if (!this._wasLeftThrusting) sfx.rcsStart('left');
      const p = toWorld(LEFT_PORT);
      spawnDirected(this, this.particles, p.x, p.y, Phaser.Math.DegToRad(this.rocketAngle + 90), 14, [HOT_AMBER, HOT], 40, 90, 0.15, 0.3, 1, 0.5);
    } else if (this._wasLeftThrusting){
      sfx.rcsStop('left');
    }
    this._wasLeftThrusting = right;

    if (left){
      if (!this._wasRightThrusting) sfx.rcsStart('right');
      const p = toWorld(RIGHT_PORT);
      spawnDirected(this, this.particles, p.x, p.y, Phaser.Math.DegToRad(this.rocketAngle + 90), 14, [HOT_AMBER, HOT], 40, 90, 0.15, 0.3, 1, 0.5);
    } else if (this._wasRightThrusting){
      sfx.rcsStop('right');
    }
    this._wasRightThrusting = left;

    const speed = body.velocity.length();
    if (speed > level.maxSpeed) body.velocity.scale(level.maxSpeed / speed);

    this.rocketGfx.setPosition(this.rocketBody.x, this.rocketBody.y);
    this.rocketGfx.setAngle(this.rocketAngle);
    // Rotating right (clockwise) means pushing the tail left, so the RIGHT
    // key fires the LEFT-mounted thruster, and vice versa.
    for (const [gfx, active] of [
      [this.leftThrustGfx, right],
      [this.rightThrustGfx, left],
      [this.centerThrustGfx, thrusting]
    ]){
      gfx.setPosition(this.rocketBody.x, this.rocketBody.y);
      gfx.setAngle(this.rocketAngle);
      gfx.setVisible(active);
    }

    const bx = this.rocketBody.x, by = this.rocketBody.y;
    const cell = world.cellSize;
    const colAt = (x) => Math.floor(x / cell);
    const rowAt = (y) => Math.floor(y / cell);
    const bottomRow = rowAt(by + ROCKET_PROBE);
    const topRow = rowAt(by - ROCKET_PROBE);
    const rightCol = colAt(bx + ROCKET_PROBE);
    const leftCol = colAt(bx - ROCKET_PROBE);
    const hitBottom = this.isSolid(bottomRow, colAt(bx));
    const hitTop = this.isSolid(topRow, colAt(bx));
    const hitRight = this.isSolid(rowAt(by), rightCol);
    const hitLeft = this.isSolid(rowAt(by), leftCol);
    const hitCenter = this.isSolid(rowAt(by), colAt(bx));
    const hitAny = hitBottom || hitTop || hitRight || hitLeft || hitCenter;

    if (hitAny){
      // Damage comes from the velocity component INTO whichever surface was
      // hit, not total speed — sliding down a wall is mostly motion parallel
      // to it (a deflection), and only the small sideways push into the wall
      // should hurt, not the large vertical speed that has nothing to do
      // with that particular impact.
      let impactSpeed = 0;
      if (hitBottom) impactSpeed = Math.max(impactSpeed, body.velocity.y);
      if (hitTop) impactSpeed = Math.max(impactSpeed, -body.velocity.y);
      if (hitRight) impactSpeed = Math.max(impactSpeed, body.velocity.x);
      if (hitLeft) impactSpeed = Math.max(impactSpeed, -body.velocity.x);
      if (hitCenter && !hitBottom && !hitTop && !hitLeft && !hitRight) impactSpeed = body.velocity.length();
      if (impactSpeed > level.wallTolerance){
        this.takeDamage((impactSpeed - level.wallTolerance) * level.wallDamage);
      }
      // Resolve only the axis/side actually touched, instead of always
      // treating contact as "the floor" — a side wall stops sideways motion,
      // a ceiling stops upward motion, and only a bottom hit is a landing.
      if (hitBottom) body.velocity.y = Math.min(body.velocity.y, 0);
      if (hitTop) body.velocity.y = Math.max(body.velocity.y, 0);
      if (hitRight) body.velocity.x = Math.min(body.velocity.x, 0);
      if (hitLeft) body.velocity.x = Math.max(body.velocity.x, 0);
      if (hitCenter && !hitBottom && !hitTop && !hitLeft && !hitRight) body.velocity.set(0, 0);

      // Snap back to exactly resting on the surface, not just zeroing
      // velocity — gravity re-adds a hair of speed every physics step before
      // the zeroing above catches it, so the body still creeps a fraction
      // of a pixel into the surface each frame. Over many seconds at rest
      // that silently accumulates into a visible sink through the floor.
      // Re-pinning the exact boundary position every frame makes resting a
      // stable equilibrium instead of a slow one-way drift.
      if (hitBottom) this.rocketBody.y = Math.min(this.rocketBody.y, bottomRow * cell - ROCKET_PROBE);
      if (hitTop) this.rocketBody.y = Math.max(this.rocketBody.y, (topRow + 1) * cell + ROCKET_PROBE);
      if (hitRight) this.rocketBody.x = Math.min(this.rocketBody.x, rightCol * cell - ROCKET_PROBE);
      if (hitLeft) this.rocketBody.x = Math.max(this.rocketBody.x, (leftCol + 1) * cell + ROCKET_PROBE);
    }
    this.landed = hitBottom;

    // While actually resting on the ground AND not under thrust, kill off
    // tiny residual velocity instead of letting gravity leave the ship in a
    // perpetual sub-pixel jitter. Gating on `!thrusting` matters: thrust adds
    // only a couple of px/s per frame, so clamping unconditionally would wipe
    // out an escape attempt before it could ever build past the threshold,
    // trapping the ship against the wall it's trying to push away from.
    if (this.landed && !thrusting){
      const STOP_EPSILON = 3;
      if (Math.abs(body.velocity.x) < STOP_EPSILON) body.velocity.x = 0;
      if (Math.abs(body.velocity.y) < STOP_EPSILON) body.velocity.y = 0;
    }
    if (this.landed){
      body.velocity.x *= 0.85;
    }

    // Delivery/refuel triggers on any safe landing at the level's home row.
    this.onSurface = this.landed && bottomRow <= level.homeRow + 1;

    if (this.onSurface){
      this.fuel = Math.min(level.fuelMax, this.fuel + level.fuelRegen * dt);
      if (this.carried > 0){
        this.rescuedTotal += this.carried;
        this.carried = 0;
        hud.updateRescuedCount(this.rescuedTotal);
        sfx.deliver();
        this.showMessage('MINERS DELIVERED TO BASE');
        if (this.rescuedTotal >= this.totalMiners){ this.endGame(true); return; }
      }
    }

    for (let si = 0; si < this.miners.length; si++){
      const m = this.miners[si];
      if (m.picked || m.falling || m.pickupCooldown > 0) continue;
      const dx = m.x - bx, dy = m.y - by;
      if (this.carried < level.capacity && (dx * dx + dy * dy) < PICKUP_RADIUS * PICKUP_RADIUS){
        m.picked = true;
        destroySurvivor(m);
        this.carried++;
        sfx.pickup();
        this.showMessage('MINER RESCUED (' + this.carried + '/' + level.capacity + ')');
      }
    }
    this.miners = this.miners.filter((m) => !m.picked);

    for (let fi = 0; fi < this.fuelPickups.length; fi++){
      const f = this.fuelPickups[fi];
      if (f.picked) continue;
      const dx = f.x - bx, dy = f.y - by;
      if ((dx * dx + dy * dy) < PICKUP_RADIUS * PICKUP_RADIUS){
        f.picked = true;
        destroyFuelPickup(f);
        this.fuel = Math.min(level.fuelMax, this.fuel + f.amount);
        sfx.refuel();
        this.showMessage('FUEL CANISTER +' + f.amount);
      }
    }
    this.fuelPickups = this.fuelPickups.filter((f) => !f.picked);

    if (this.fuel <= 0){
      if (!this._stranded){
        this._stranded = true;
        this._strandedEjected = false;
        this.showMessage('OUT OF FUEL — HULL FAILING', 3);
      }
      // The crew rides it out rather than bailing mid-air — they only jump
      // once the ship actually comes to rest. If it never lands, they go
      // down with it when the explosion ejects them instead.
      if (this.landed && !this._strandedEjected && !this._exploding){
        this._strandedEjected = true;
        this.ejectCarriedMiners();
        this.showMessage('CREW BAILING OUT', 2);
      }
      // dead in the water: shield fails on its own until the ship explodes,
      // unless a fuel pickup saves it first (fuel > 0 resets this below)
      this.shield -= (level.shieldMax / level.strandedTimeToExplode) * dt;
      this.lowFuelWarned -= dt;
      if (this.lowFuelWarned <= 0){ sfx.lowFuel(); this.lowFuelWarned = 0.25; }
      if (this.shield <= 0) this.loseLife();
    } else {
      this._stranded = false;
      if (this.fuel < level.fuelMax * 0.2){
        this.lowFuelWarned -= dt;
        if (this.lowFuelWarned <= 0){ sfx.lowFuel(); this.lowFuelWarned = 0.9; }
      }
    }
    hud.updateFuelBar(this.fuel, level.fuelMax);
    hud.updateShieldBar(this.shield, level.shieldMax);
    hud.updateCarrying(this.carried, level.capacity);

    if (this.msgTimer > 0){
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) hud.clearMessage();
    }

    hud.updateLivesHud(this.lives);
    updateParticles(this.particles, dt);
  }
}
