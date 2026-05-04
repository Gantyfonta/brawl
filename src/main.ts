import './index.css';
import { BrawlerConfig, BRAWLERS, Player, Box, Bullet, PowerCube, BrawlerType, Zone } from './types/game';

// --- Constants ---
const WORLD_SIZE = 2500;
const BOT_COUNT = 9;
const BOX_COUNT = 25;
const PLAYER_SIZE = 30;
const BOX_SIZE = 60;
const POWER_CUBE_SIZE = 20;

const TROPHY_CHANGES: Record<number, number> = {
  1: 10, 2: 8, 3: 6, 4: 4, 5: 2, 6: 1, 7: -1, 8: -2, 9: -3, 10: -4
};

// --- Storage ---
interface Trophies {
  total: number;
  brawlers: Record<BrawlerType, number>;
}

function getStoredTrophies(): Trophies {
  const saved = localStorage.getItem('mini_brawl_trophies_v2');
  if (saved) return JSON.parse(saved);
  return {
    total: 0,
    brawlers: { shelly: 0, colt: 0, spike: 0 }
  };
}

function saveTrophies(trophies: Trophies) {
  localStorage.setItem('mini_brawl_trophies_v2', JSON.stringify(trophies));
}

// --- Game Engine State ---
class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  uiContainer: HTMLElement;
  state: 'MENU' | 'SELECT' | 'GAME' | 'GAMEOVER' = 'MENU';
  
  selectedBrawler: BrawlerConfig = BRAWLERS.shelly;
  trophies: Trophies = getStoredTrophies();
  
  // World State
  player: Player | null = null;
  bots: Player[] = [];
  boxes: Box[] = [];
  bullets: Bullet[] = [];
  cubes: PowerCube[] = [];
  zones: Zone[] = [];
  
  // Input
  keys: Record<string, boolean> = {};
  mouse = { x: 0, y: 0, down: false };
  
  // Rendering
  viewport = { w: window.innerWidth, h: window.innerHeight };
  camera = { x: 0, y: 0 };
  lastTick = Date.now();
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    document.getElementById('game-container')!.appendChild(this.canvas);
    this.uiContainer = document.getElementById('game-ui')!;
    
    window.addEventListener('resize', () => {
      this.viewport.w = window.innerWidth;
      this.viewport.h = window.innerHeight;
      this.canvas.width = this.viewport.w;
      this.canvas.height = this.viewport.h;
    });
    
    window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', () => this.mouse.down = true);
    window.addEventListener('mouseup', () => this.mouse.down = false);
    
    this.canvas.width = this.viewport.w;
    this.canvas.height = this.viewport.h;
    
    this.renderMenu();
    this.loop();
  }

  // --- UI Rendering ---
  clearUI() {
    this.uiContainer.innerHTML = '';
    this.uiContainer.className = 'absolute inset-0 z-10 pointer-events-none';
  }

  renderMenu() {
    this.state = 'MENU';
    this.clearUI();
    this.uiContainer.classList.add('pointer-events-auto', 'flex', 'flex-col', 'items-center', 'justify-center');
    
    const totalTrophiesValue = Object.values(this.trophies.brawlers).reduce((a, b) => a + b, 0);
    
    this.uiContainer.innerHTML = `
      <div class="absolute top-8 left-12 flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
        <span class="text-yellow-400">🏆</span>
        <span class="text-2xl brawl-font italic text-white">${totalTrophiesValue}</span>
      </div>

      <h1 class="text-6xl md:text-8xl brawl-font italic font-black text-yellow-400 mb-8 drop-shadow-[0_5px_0_rgba(0,0,0,0.5)]">
        MINI BRAWL
      </h1>
      
      <div id="brawler-selector" class="relative group cursor-pointer mb-8 bg-slate-800 rounded-3xl p-6 border-4 border-slate-700 hover:border-yellow-400 transition-colors w-64 text-center">
        <div class="text-4xl mb-2">${this.selectedBrawler.emoji}</div>
        <div class="text-xl font-bold uppercase">${this.selectedBrawler.name}</div>
        <div class="flex items-center justify-center gap-2 mt-1 text-yellow-400 font-bold">
          <span>🏆</span> ${this.trophies.brawlers[this.selectedBrawler.type]}
        </div>
        <div class="mt-2 text-xs opacity-50 uppercase font-bold">Tap to change</div>
      </div>

      <button id="play-button" class="bg-yellow-400 hover:bg-yellow-300 transform hover:scale-110 active:scale-95 transition-all text-slate-900 px-12 py-4 rounded-full text-3xl brawl-font italic font-black flex items-center gap-4 shadow-[0_6px_0_rgba(180,130,0,1)]">
        PLAY
      </button>
    `;
    
    document.getElementById('brawler-selector')!.onclick = () => this.renderSelect();
    document.getElementById('play-button')!.onclick = () => this.startGame();
  }

  renderSelect() {
    this.state = 'SELECT';
    this.clearUI();
    this.uiContainer.classList.add('pointer-events-auto', 'flex', 'flex-col', 'items-center', 'justify-center');
    
    const brawlerList = Object.values(BRAWLERS);
    
    this.uiContainer.innerHTML = `
      <div class="w-full max-w-4xl px-4">
        <h2 class="text-4xl brawl-font italic text-white mb-8 text-center uppercase">Select Brawler</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${brawlerList.map(b => `
            <div data-brawler="${b.type}" class="brawler-card cursor-pointer rounded-3xl p-6 border-4 transition-all hover:scale-105 ${this.selectedBrawler.type === b.type ? 'bg-yellow-400/20 border-yellow-400' : 'bg-slate-800/50 border-slate-700 border-dashed'}">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                  <span>🏆</span> ${this.trophies.brawlers[b.type]}
                </div>
              </div>
              <div class="text-7xl mb-4 text-center">${b.emoji}</div>
              <h3 class="text-2xl font-bold text-center mb-4 uppercase">${b.name}</h3>
              <div class="space-y-1 text-[10px] uppercase opacity-80">
                <div class="flex justify-between"><span>HP</span> <span>${b.hp}</span></div>
                <div class="flex justify-between"><span>DMG</span> <span>${b.damage}</span></div>
              </div>
            </div>
          `).join('')}
        </div>
        <button id="back-button" class="mt-12 text-slate-400 hover:text-white uppercase font-bold w-full">Back to Menu</button>
      </div>
    `;
    
    document.querySelectorAll('.brawler-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const type = (e.currentTarget as HTMLElement).dataset.brawler as BrawlerType;
        this.selectedBrawler = BRAWLERS[type];
        this.renderMenu();
      });
    });
    
    document.getElementById('back-button')!.onclick = () => this.renderMenu();
  }

  renderGameOver(rank: number, cubes: number) {
    this.state = 'GAMEOVER';
    this.clearUI();
    this.uiContainer.classList.add('pointer-events-auto', 'flex', 'flex-col', 'items-center', 'justify-center');
    
    const change = TROPHY_CHANGES[rank] || -5;
    this.trophies.brawlers[this.selectedBrawler.type] = Math.max(0, this.trophies.brawlers[this.selectedBrawler.type] + change);
    saveTrophies(this.trophies);

    this.uiContainer.innerHTML = `
      <div class="text-center">
        <div class="text-8xl brawl-font italic font-black mb-4 ${rank === 1 ? 'text-yellow-400' : 'text-slate-400'}">
          #${rank}
        </div>
        <div class="text-2xl uppercase mb-8 opacity-60">
          ${rank === 1 ? 'Showdown Victory!' : `Rank ${rank} - Defeated`}
        </div>
        <div class="bg-slate-800 rounded-3xl p-6 mb-8 border-4 border-slate-700 min-w-80">
          <div class="flex flex-col gap-6">
            <div class="flex items-center justify-between gap-12">
              <span class="text-yellow-400 font-bold uppercase text-xl">🏆 Trophies</span>
              <span class="text-4xl font-black ${change >= 0 ? 'text-green-400' : 'text-red-400'}">
                ${change >= 0 ? '+' : ''}${change}
              </span>
            </div>
            <div class="flex items-center justify-between gap-12 border-t border-slate-700 pt-4">
              <span class="text-blue-400 font-bold uppercase text-xl">⚡ Power Cubes</span>
              <span class="text-4xl font-black">${cubes}</span>
            </div>
          </div>
        </div>
        <button id="restart-button" class="bg-slate-100 hover:bg-white text-slate-900 px-12 py-4 rounded-full text-2xl brawl-font italic font-black transition-transform hover:scale-110">
          CONTINUE
        </button>
      </div>
    `;
    
    document.getElementById('restart-button')!.onclick = () => this.renderMenu();
  }

  // --- Game Mechanics ---
  startGame() {
    this.state = 'GAME';
    this.clearUI();
    
    // HUD setup (vanilla way)
    this.uiContainer.innerHTML = `
      <div class="absolute top-4 left-4 flex gap-4 pointer-events-none">
        <div class="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border-2 border-yellow-400 flex items-center gap-2">
            <span class="text-yellow-400 text-xl">⚡</span>
            <span id="cube-counter" class="text-2xl font-black italic">0</span>
        </div>
        <div class="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border-2 border-slate-700 flex items-center gap-2">
            <span class="text-slate-400 text-xl">👤</span>
            <span id="player-counter" class="text-2xl font-black italic">10</span>
        </div>
      </div>

      <div class="absolute bottom-4 right-4 flex flex-col items-end pointer-events-none">
           <div id="super-button" class="relative w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 overflow-hidden flex items-center justify-center">
                <div id="super-fill" class="absolute bottom-0 w-full bg-yellow-400" style="height: 0%"></div>
                <div id="super-text" class="relative z-10 brawl-font italic font-black text-2xl text-slate-400">SUPER</div>
           </div>
           <div class="mt-2 text-[10px] uppercase font-black text-slate-400/50">Space / E</div>
      </div>

      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 pointer-events-none">
        <div class="h-4 bg-black/50 rounded-full border-2 border-white/20 overflow-hidden shadow-lg">
            <div id="hp-fill" class="h-full bg-green-500 transition-all duration-200" style="width: 100%"></div>
        </div>
        <div id="hp-text" class="text-center text-xs font-bold uppercase mt-2 drop-shadow-md">
            HP 0 / 0
        </div>
      </div>
    `;

    this.player = {
      id: 'player',
      x: WORLD_SIZE / 2,
      y: WORLD_SIZE / 2,
      size: PLAYER_SIZE,
      hp: this.selectedBrawler.hp,
      maxHp: this.selectedBrawler.hp,
      powerCubes: 0,
      config: this.selectedBrawler,
      isBot: false,
      lastShot: 0,
      angle: 0,
      superCharge: 0,
      lastSuper: 0
    };

    this.bots = Array.from({ length: BOT_COUNT }).map((_, i) => {
      const types: BrawlerType[] = ['shelly', 'colt', 'spike'];
      const config = BRAWLERS[types[Math.floor(Math.random() * 3)]];
      return {
        id: `bot-${i}`,
        x: Math.random() * (WORLD_SIZE - 400) + 200,
        y: Math.random() * (WORLD_SIZE - 400) + 200,
        size: PLAYER_SIZE,
        hp: config.hp,
        maxHp: config.hp,
        powerCubes: 0,
        config,
        isBot: true,
        lastShot: 0,
        angle: Math.random() * Math.PI * 2,
        superCharge: 0,
        lastSuper: 0
      };
    });

    this.boxes = Array.from({ length: BOX_COUNT }).map((_, i) => ({
      id: `box-${i}`,
      x: Math.random() * (WORLD_SIZE - 600) + 300,
      y: Math.random() * (WORLD_SIZE - 600) + 300,
      size: BOX_SIZE,
      hp: 1500,
      maxHp: 1500,
      powerCubes: 0,
      isDestroyed: false
    }));

    this.bullets = [];
    this.cubes = [];
    this.zones = [];
    this.lastTick = Date.now();
  }

  shoot(shooter: Player, targetX: number, targetY: number, isSuper = false) {
    const now = Date.now();
    if (!isSuper && now - shooter.lastShot < shooter.config.reloadTime) return;

    if (isSuper) {
      if (shooter.superCharge < 100) return;
      shooter.superCharge = 0;
      shooter.lastSuper = now;
    } else {
      shooter.lastShot = now;
    }

    const angle = Math.atan2(targetY - shooter.y, targetX - shooter.x);
    shooter.angle = angle;

    const spawnBullet = (ang: number, extraRange = 0, isSuperBullet = false) => {
      const bullet: Bullet = {
        id: Math.random().toString(36).substr(2, 9),
        ownerId: shooter.id,
        x: shooter.x,
        y: shooter.y,
        dx: Math.cos(ang) * (isSuperBullet ? shooter.config.bulletSpeed * 1.2 : shooter.config.bulletSpeed),
        dy: Math.sin(ang) * (isSuperBullet ? shooter.config.bulletSpeed * 1.2 : shooter.config.bulletSpeed),
        damage: (isSuperBullet ? shooter.config.damage * 1.5 : shooter.config.damage) * (1 + shooter.powerCubes * 0.1),
        rangeRemaining: shooter.config.range + extraRange,
        size: isSuperBullet ? shooter.config.bulletSize * 1.5 : shooter.config.bulletSize,
        color: isSuperBullet ? '#fbbf24' : shooter.config.color,
        type: shooter.config.type,
        isSuper: isSuperBullet
      };
      this.bullets.push(bullet);
    };

    if (shooter.config.type === 'shelly') {
      if (isSuper) {
        for (let i = -4; i <= 4; i++) spawnBullet(angle + (i * 0.15), 100, true);
      } else {
        for (let i = -1; i <= 1; i++) spawnBullet(angle + (i * 0.2));
      }
    } else if (shooter.config.type === 'colt') {
      const count = isSuper ? 12 : 4;
      const interval = isSuper ? 60 : 100;
      for (let i = 0; i < count; i++) {
        setTimeout(() => spawnBullet(angle, isSuper ? 200 : 0, isSuper), i * interval);
      }
    } else if (shooter.config.type === 'spike') {
      if (isSuper) {
        this.bullets.push({
          id: Math.random().toString(36).substr(2, 4),
          ownerId: shooter.id, x: shooter.x, y: shooter.y,
          dx: Math.cos(angle) * 10, dy: Math.sin(angle) * 10,
          damage: shooter.config.damage * (1 + shooter.powerCubes * 0.1),
          rangeRemaining: 400, size: 20, color: '#166534', type: 'spike', isSuper: true
        });
      } else {
        spawnBullet(angle);
      }
    }
  }

  update() {
    if (this.state !== 'GAME' || !this.player) return;
    const now = Date.now();
    const dt = now - this.lastTick;
    this.lastTick = now;

    // Movement
    let dx = 0, dy = 0;
    if (this.keys['w']) dy -= 1;
    if (this.keys['s']) dy += 1;
    if (this.keys['a']) dx -= 1;
    if (this.keys['d']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      this.player.x += (dx / length) * this.player.config.speed;
      this.player.y += (dy / length) * this.player.config.speed;
    }
    this.player.x = Math.max(0, Math.min(WORLD_SIZE, this.player.x));
    this.player.y = Math.max(0, Math.min(WORLD_SIZE, this.player.y));

    // Rotation
    const worldMouseX = this.mouse.x + this.camera.x;
    const worldMouseY = this.mouse.y + this.camera.y;
    this.player.angle = Math.atan2(worldMouseY - this.player.y, worldMouseX - this.player.x);

    // Camera
    const lookAhead = 100;
    const targetX = this.player.x + Math.cos(this.player.angle) * lookAhead - this.viewport.w / 2;
    const targetY = this.player.y + Math.sin(this.player.angle) * lookAhead - this.viewport.h / 2;
    this.camera.x += (targetX - this.camera.x) * 0.08;
    this.camera.y += (targetY - this.camera.y) * 0.08;
    this.camera.x = Math.max(0, Math.min(WORLD_SIZE - this.viewport.w, this.camera.x));
    this.camera.y = Math.max(0, Math.min(WORLD_SIZE - this.viewport.h, this.camera.y));

    // Action
    if (this.mouse.down) this.shoot(this.player, worldMouseX, worldMouseY);
    if (this.keys['e'] || this.keys[' ']) this.shoot(this.player, worldMouseX, worldMouseY, true);

    // Bots AI
    this.bots.forEach(bot => {
      const targets = [this.player!, ...this.bots.filter(b => b.id !== bot.id), ...this.boxes.filter(b => !b.isDestroyed)];
      let nearest: any = null, minDist = 2000;
      targets.forEach(t => {
        const d = Math.hypot(t.x - bot.x, t.y - bot.y);
        if (d < minDist) { minDist = d; nearest = t; }
      });

      if (nearest) {
        const ang = Math.atan2(nearest.y - bot.y, nearest.x - bot.x);
        bot.angle = ang;
        if (minDist > bot.config.range * 0.7) {
          bot.x += Math.cos(ang) * bot.config.speed;
          bot.y += Math.sin(ang) * bot.config.speed;
        }
        if (minDist < bot.config.range) this.shoot(bot, nearest.x, nearest.y);
        if (bot.superCharge >= 100) this.shoot(bot, nearest.x, nearest.y, true);
      }
    });

    // World updates (Zones, Bullets, Boxes)
    this.updateWorldObjects(now, dt);
    
    // HUD Updates
    const hpFill = document.getElementById('hp-fill');
    const hpText = document.getElementById('hp-text');
    const cubeCounter = document.getElementById('cube-counter');
    const playerCounter = document.getElementById('player-counter');
    const superFill = document.getElementById('super-fill');
    const superButton = document.getElementById('super-button');

    if (hpFill) hpFill.style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
    if (hpText) hpText.innerText = `HP ${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;
    if (cubeCounter) cubeCounter.innerText = this.player.powerCubes.toString();
    if (playerCounter) playerCounter.innerText = (this.bots.length + 1).toString();
    if (superFill) superFill.style.height = `${this.player.superCharge}%`;
    if (superButton) {
      if (this.player.superCharge >= 100) {
        superButton.classList.add('border-yellow-400', 'animate-pulse');
        const text = document.getElementById('super-text');
        if (text) text.className = 'relative z-10 brawl-font italic font-black text-2xl text-slate-900';
      } else {
        superButton.classList.remove('border-yellow-400', 'animate-pulse');
         const text = document.getElementById('super-text');
        if (text) text.className = 'relative z-10 brawl-font italic font-black text-2xl text-slate-400';
      }
    }

    if (this.player.hp <= 0) this.renderGameOver(this.bots.length + 1, this.player.powerCubes);
    if (this.bots.length === 0) this.renderGameOver(1, this.player.powerCubes);
  }

  updateWorldObjects(now: number, dt: number) {
    // Zones
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (now - z.createdAt > z.duration) { this.zones.splice(i, 1); continue; }
      if (Math.floor((now - z.createdAt) / 500) !== Math.floor((now - z.createdAt - dt) / 500)) {
        [this.player!, ...this.bots].forEach(t => {
          if (t.id === z.ownerId) return;
          if (Math.hypot(t.x - z.x, t.y - z.y) < z.radius + t.size) {
            t.hp -= z.damage;
            const owner = [this.player!, ...this.bots].find(p => p.id === z.ownerId);
            if (owner) owner.superCharge = Math.min(100, owner.superCharge + 3);
          }
        });
      }
    }

    // Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.dx; b.y += b.dy;
      b.rangeRemaining -= Math.hypot(b.dx, b.dy);
      if (b.rangeRemaining <= 0) {
        if (b.type === 'spike') {
          if (b.isSuper) this.zones.push({ id: Math.random().toString(), ownerId: b.ownerId, x: b.x, y: b.y, radius: 120, duration: 4000, createdAt: now, damage: 400 });
          else for(let j=0; j<6; j++) {
            const ang = (j/6)*Math.PI*2;
            this.bullets.push({ ...b, id: b.id+j, dx: Math.cos(ang)*4, dy: Math.sin(ang)*4, rangeRemaining: 100, damage: b.damage*0.4, type: 'shelly' });
          }
        }
        this.bullets.splice(i, 1);
        continue;
      }
      [this.player!, ...this.bots, ...this.boxes.filter(bx => !bx.isDestroyed)].forEach(t => {
        if (t.id === b.ownerId) return;
        if (Math.hypot(b.x - t.x, b.y - t.y) < t.size) {
          t.hp -= b.damage;
          const shooter = [this.player!, ...this.bots].find(p => p.id === b.ownerId);
          if (shooter) shooter.superCharge = Math.min(100, shooter.superCharge + (b.damage / 30));
          this.bullets.splice(i, 1);
        }
      });
    }

    // Cubs
    this.bots.forEach((b, idx) => { if (b.hp <= 0) { this.cubes.push({ id: b.id + 'c', x: b.x, y: b.y, size: 20, isCollected: false } as any); this.bots.splice(idx, 1); } });
    this.boxes.forEach(b => { if (!b.isDestroyed && b.hp <= 0) { b.isDestroyed = true; this.cubes.push({ id: b.id + 'c', x: b.x, y: b.y, size: 20, isCollected: false } as any); } });
    
    for (let i = this.cubes.length - 1; i >= 0; i--) {
        const c = this.cubes[i];
        [this.player!, ...this.bots].forEach(p => {
            if (Math.hypot(p.x - c.x, p.y - c.y) < p.size + c.size) {
                p.powerCubes++; p.maxHp += 400; p.hp += 400;
                this.cubes.splice(i, 1);
            }
        });
    }
  }

  draw() {
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.viewport.w, this.viewport.h);
    
    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Boundary
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 10;
    this.ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Grid
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 1;
    for(let i=0; i<WORLD_SIZE; i+=100) {
      this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, WORLD_SIZE); this.ctx.stroke();
      this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(WORLD_SIZE, i); this.ctx.stroke();
    }

    // Zones
    this.zones.forEach(z => {
      this.ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      this.ctx.beginPath(); this.ctx.arc(z.x, z.y, z.radius, 0, Math.PI*2); this.ctx.fill();
    });

    // Boxes
    this.boxes.forEach(b => {
      if (b.isDestroyed) return;
      this.ctx.fillStyle = '#b45309';
      this.ctx.fillRect(b.x - b.size/2, b.y - b.size/2, b.size, b.size);
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.fillRect(b.x - b.size/2, b.y - b.size/2 - 15, b.size * (b.hp / b.maxHp), 6);
    });

    // Elements
    this.cubes.forEach(c => {
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.beginPath(); this.ctx.arc(c.x, c.y, c.size, 0, Math.PI*2); this.ctx.fill();
    });

    this.bullets.forEach(b => {
      this.ctx.fillStyle = b.color;
      this.ctx.beginPath(); this.ctx.arc(b.x, b.y, b.size, 0, Math.PI*2); this.ctx.fill();
    });

    [this.player!, ...this.bots].filter(Boolean).forEach(p => {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle);
      this.ctx.fillStyle = p.config.color;
      this.ctx.beginPath(); this.ctx.arc(0, 0, p.size, 0, Math.PI*2); this.ctx.fill();
      this.ctx.fillStyle = 'white';
      this.ctx.fillRect(p.size * 0.5, -5, 10, 10);
      this.ctx.restore();

      this.ctx.font = '24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(p.config.emoji, p.x, p.y + 8);
      
      // HP
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(p.x - 30, p.y - p.size - 20, 60, 6);
      this.ctx.fillStyle = p.id === 'player' ? '#22c55e' : '#ef4444';
      this.ctx.fillRect(p.x - 30, p.y - p.size - 20, 60 * (p.hp / p.maxHp), 6);
    });

    this.ctx.restore();
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

new GameEngine();
