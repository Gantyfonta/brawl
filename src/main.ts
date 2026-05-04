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
  let trophies: Trophies = { total: 0, brawlers: { shelly: 0, colt: 0, spike: 0, colette: 0, edgar: 0, griff: 0, penny: 0, darryl: 0, tick: 0 } as Record<BrawlerType, number> };
  if (saved) {
    const parsed = JSON.parse(saved);
    trophies.total = parsed.total || 0;
    Object.keys(BRAWLERS).forEach(k => {
      trophies.brawlers[k as BrawlerType] = parsed.brawlers[k] || 0;
    });
  }
  return trophies;
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
  walls: {x: number, y: number, width: number, height: number}[] = [];
  bullets: Bullet[] = [];
  cubes: PowerCube[] = [];
  zones: Zone[] = [];
  
  // Input
  keys: Record<string, boolean> = {};
  mouse = { x: 0, y: 0, down: false };
  isAimingSuper = false;
  
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
    
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.keys[key] = true;
      if (key === ' ' || key === 'e') e.preventDefault();
      if ((key === 'e' || key === ' ') && this.state === 'GAME' && this.player && this.player.superCharge >= 100) {
        this.isAimingSuper = true;
      }
    });
    
    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.keys[key] = false;
      if ((key === 'e' || key === ' ') && this.state === 'GAME' && this.isAimingSuper) {
        this.isAimingSuper = false;
        if (this.player) {
          const worldMouseX = this.mouse.x + this.camera.x;
          const worldMouseY = this.mouse.y + this.camera.y;
          this.shoot(this.player, worldMouseX, worldMouseY, true);
        }
      }
    });
    
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', () => {
      this.mouse.down = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    
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
    this.uiContainer.classList.remove('pointer-events-none');
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
    this.uiContainer.classList.remove('pointer-events-none');
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
    this.uiContainer.classList.remove('pointer-events-none');
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
        <div id="cube-container" class="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border-2 border-yellow-400 flex items-center gap-2 transition-all duration-200 origin-center ease-out">
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
        <div id="ammo-indicator" class="mt-4 flex justify-between gap-1 h-3 pointer-events-none">
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
      lastSuper: 0,
      ammo: 3,
      maxAmmo: 3,
      reloadTimer: 0,
      lastCombatTime: 0
    };

    // Pre-center camera
    this.camera.x = this.player.x - this.viewport.w / 2;
    this.camera.y = this.player.y - this.viewport.h / 2;
    this.isAimingSuper = false;

    this.boxes = [];
    while (this.boxes.length < BOX_COUNT) {
      let wx = Math.floor(Math.random() * (WORLD_SIZE / 100)) * 100;
      let wy = Math.floor(Math.random() * (WORLD_SIZE / 100)) * 100;
      if (Math.hypot(wx + 50 - WORLD_SIZE/2, wy + 50 - WORLD_SIZE/2) > 200) {
        if (!this.boxes.some(b => b.x === wx + 50 && b.y === wy + 50)) {
           this.boxes.push({
             id: `box-${this.boxes.length}`,
             x: wx + 50, y: wy + 50, size: BOX_SIZE, hp: 1500, maxHp: 1500, powerCubes: 0, isDestroyed: false
           });
        }
      }
    }

    this.walls = [];
    while (this.walls.length < 80) {
      let wx = Math.floor(Math.random() * (WORLD_SIZE / 100)) * 100;
      let wy = Math.floor(Math.random() * (WORLD_SIZE / 100)) * 100;
      if (Math.hypot(wx + 50 - WORLD_SIZE/2, wy + 50 - WORLD_SIZE/2) > 300) {
        if (!this.boxes.some(b => b.x === wx + 50 && b.y === wy + 50) && !this.walls.some(w => w.x === wx && w.y === wy)) {
          this.walls.push({ x: wx, y: wy, width: 100, height: 100 });
        }
      }
    }

    this.bots = Array.from({ length: BOT_COUNT }).map((_, i) => {
      const types = Object.keys(BRAWLERS) as BrawlerType[];
      const config = BRAWLERS[types[Math.floor(Math.random() * types.length)]];
      
      let bx = 0, by = 0;
      for(let k=0; k<20; k++) {
          bx = Math.floor(Math.random() * (WORLD_SIZE / 100)) * 100 + 50;
          by = Math.floor(Math.random() * (WORLD_SIZE / 100)) * 100 + 50;
          if (Math.hypot(bx - WORLD_SIZE/2, by - WORLD_SIZE/2) > 400 &&
              !this.walls.some(w => w.x <= bx && w.x+100 >= bx && w.y <= by && w.y+100 >= by) &&
              !this.boxes.some(b => b.x === bx && b.y === by)) {
              break;
          }
      }

      return {
        id: `bot-${i}`,
        x: bx,
        y: by,
        size: PLAYER_SIZE,
        hp: config.hp,
        maxHp: config.hp,
        powerCubes: 0,
        config,
        isBot: true,
        lastShot: 0,
        angle: Math.random() * Math.PI * 2,
        superCharge: 0,
        lastSuper: 0,
        ammo: 3,
        maxAmmo: 3,
        reloadTimer: 0,
        lastCombatTime: 0
      };
    });

    this.bullets = [];
    this.cubes = [];
    this.zones = [];
    this.lastTick = Date.now();
  }

  shoot(shooter: Player, targetX: number, targetY: number, isSuper = false) {
    const now = Date.now();

    if (!isSuper) {
      if (shooter.ammo < 1) return;
      if (now - shooter.lastShot < 250) return;
      shooter.ammo--;
      shooter.lastShot = now;
      shooter.lastCombatTime = now;
    } else {
      if (shooter.superCharge < 100) return;
      shooter.superCharge = 0;
      shooter.lastSuper = now;
      shooter.lastCombatTime = now;
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
        isSuper: isSuperBullet,
        hitIds: []
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
          rangeRemaining: 400, size: 20, color: '#166534', type: 'spike', isSuper: true, hitIds: []
        });
      } else {
        spawnBullet(angle);
      }
    } else if (shooter.config.type === 'colette') {
      if (isSuper) {
        const dist = Math.min(Math.hypot(targetX - shooter.x, targetY - shooter.y), 450);
        shooter.dashState = {
            origin: {x: shooter.x, y: shooter.y},
            target: {x: shooter.x + Math.cos(angle)*dist, y: shooter.y + Math.sin(angle)*dist},
            return: false, isBounce: true, speed: 25, hitIds: []
        };
      } else {
        spawnBullet(angle);
      }
    } else if (shooter.config.type === 'edgar') {
      if (isSuper) {
        const dist = Math.hypot(targetX - shooter.x, targetY - shooter.y);
        const jumpRange = Math.min(dist, 400);
        shooter.x += Math.cos(angle) * jumpRange;
        shooter.y += Math.sin(angle) * jumpRange;
        shooter.x = Math.max(0, Math.min(WORLD_SIZE, shooter.x));
        shooter.y = Math.max(0, Math.min(WORLD_SIZE, shooter.y));
      } else {
        setTimeout(() => spawnBullet(angle - 0.05), 0);
        setTimeout(() => spawnBullet(angle + 0.05), 150);
      }
    } else if (shooter.config.type === 'griff') {
      if (isSuper) {
        for (let i = -2; i <= 2; i++) {
          spawnBullet(angle + (i * 0.15), 200, true);
        }
      } else {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            spawnBullet(angle - 0.1);
            spawnBullet(angle);
            spawnBullet(angle + 0.1);
          }, i * 150);
        }
      }
    } else if (shooter.config.type === 'penny') {
      if (isSuper) {
        spawnBullet(angle, 350, true); // giant bag of coins
      } else {
        spawnBullet(angle);
      }
    } else if (shooter.config.type === 'darryl') {
      if (isSuper) {
        shooter.dashState = {
            origin: {x: shooter.x, y: shooter.y},
            target: {x: shooter.x + Math.cos(angle)*500, y: shooter.y + Math.sin(angle)*500},
            return: false, isBounce: false, speed: 22, hitIds: []
        };
      } else {
        for(let wave = 0; wave < 2; wave++) {
            for(let p = -2; p <= 2; p++) {
                setTimeout(() => spawnBullet(angle + p*0.1, 0, false), wave * 150);
            }
        }
      }
    } else if (shooter.config.type === 'tick') {
      const dist = Math.min(Math.hypot(targetX - shooter.x, targetY - shooter.y), shooter.config.range);
      if (isSuper) {
        this.bullets.push({
            id: Math.random()+'', ownerId: shooter.id, x: shooter.x, y: shooter.y,
            dx: Math.cos(angle) * 12, dy: Math.sin(angle) * 12, damage: shooter.config.damage * 3 * (1 + shooter.powerCubes * 0.1),
            rangeRemaining: dist, size: 25, color: '#ef4444', type: 'tick', isSuper: true
        });
      } else {
        for (let i = -1; i <= 1; i++) {
            const spread = angle + i * 0.2;
            this.bullets.push({
                id: Math.random()+'', ownerId: shooter.id, x: shooter.x, y: shooter.y,
                dx: Math.cos(spread) * 14, dy: Math.sin(spread) * 14, damage: shooter.config.damage * (1 + shooter.powerCubes * 0.1),
                rangeRemaining: dist, size: 12 + (i===0?4:0), color: '#9ca3af', type: 'tick', isSuper: false
            });
        }
      }
    }
  }

  update() {
    if (this.state !== 'GAME' || !this.player) return;
    const now = Date.now();
    const dt = now - this.lastTick;
    this.lastTick = now;

    [this.player!, ...this.bots].forEach(p => {
        if (p.ammo < p.maxAmmo) {
            p.reloadTimer += dt;
            if (p.reloadTimer >= p.config.reloadTime) {
                p.ammo++;
                p.reloadTimer -= p.config.reloadTime;
            }
        } else {
            p.reloadTimer = 0;
        }

        if (now - p.lastCombatTime > 3000 && p.hp < p.maxHp) {
            p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.13 * (dt / 1000));
        }

        if (p.dashState) {
            const dest = p.dashState.return ? p.dashState.origin : p.dashState.target;
            const len = Math.hypot(dest.x - p.x, dest.y - p.y);
            if (len < p.dashState.speed) {
                p.x = dest.x; p.y = dest.y;
                if (!p.dashState.return && p.dashState.isBounce) {
                    p.dashState.return = true;
                    p.dashState.hitIds = [];
                } else {
                    p.dashState = undefined;
                }
            } else {
                p.x += ((dest.x - p.x) / len) * p.dashState.speed;
                p.y += ((dest.y - p.y) / len) * p.dashState.speed;
            }

            if (p.dashState) {
               [this.player!, ...this.bots, ...this.boxes.filter(bx => !bx.isDestroyed)].forEach(t => {
                   if (t.id === p.id || p.dashState!.hitIds.includes(t.id)) return;
                   if (Math.hypot(p.x - t.x, p.y - t.y) < p.size + t.size) {
                       t.hp -= (p.config.type === 'colette' ? p.config.damage * 2 : 800) * (1 + p.powerCubes * 0.1);
                       t.lastCombatTime = now;
                       p.lastCombatTime = now;
                       p.dashState!.hitIds.push(t.id);
                       if (!t.id.startsWith('box')) p.superCharge = Math.min(100, p.superCharge + 25);
                   }
               });
            }
        }
    });

    const resolveCollisions = (entity: { x: number, y: number, size: number }) => {
        let maxIter = 4;
        while(maxIter-- > 0) {
            let collision = false;
            
            // Check walls
            this.walls.forEach(w => {
                let testX = entity.x;
                let testY = entity.y;
                if (entity.x < w.x) testX = w.x; else if (entity.x > w.x + w.width) testX = w.x + w.width;
                if (entity.y < w.y) testY = w.y; else if (entity.y > w.y + w.height) testY = w.y + w.height;
                let dist = Math.hypot(entity.x - testX, entity.y - testY);
                if (dist < entity.size) {
                     collision = true;
                     if (dist === 0) dist = 1;
                     let overlap = entity.size - dist;
                     let nx = (entity.x - testX) / dist;
                     let ny = (entity.y - testY) / dist;
                     entity.x += nx * overlap;
                     entity.y += ny * overlap;
                }
            });

            // Check boxes
            this.boxes.forEach(b => {
                if (b.isDestroyed) return;
                let half = b.size / 2;
                let w = { x: b.x - half, y: b.y - half, width: b.size, height: b.size };
                let testX = entity.x;
                let testY = entity.y;
                if (entity.x < w.x) testX = w.x; else if (entity.x > w.x + w.width) testX = w.x + w.width;
                if (entity.y < w.y) testY = w.y; else if (entity.y > w.y + w.height) testY = w.y + w.height;
                let dist = Math.hypot(entity.x - testX, entity.y - testY);
                if (dist < entity.size) {
                     collision = true;
                     if (dist === 0) dist = 1;
                     let overlap = entity.size - dist;
                     let nx = (entity.x - testX) / dist;
                     let ny = (entity.y - testY) / dist;
                     entity.x += nx * overlap;
                     entity.y += ny * overlap;
                }
            });
            if (!collision) break;
        }
    };

    if (!this.player.dashState) {
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

        // Rotation
        const worldMouseX = this.mouse.x + this.camera.x;
        const worldMouseY = this.mouse.y + this.camera.y;
        this.player.angle = Math.atan2(worldMouseY - this.player.y, worldMouseX - this.player.x);

        // Action
        if (this.mouse.down && !this.isAimingSuper) this.shoot(this.player, worldMouseX, worldMouseY);
    }
    
    resolveCollisions(this.player);
    this.player.x = Math.max(0, Math.min(WORLD_SIZE, this.player.x));
    this.player.y = Math.max(0, Math.min(WORLD_SIZE, this.player.y));

    // Camera
    const lookAhead = 100;
    const targetX = this.player.x + Math.cos(this.player.angle) * lookAhead - this.viewport.w / 2;
    const targetY = this.player.y + Math.sin(this.player.angle) * lookAhead - this.viewport.h / 2;
    this.camera.x += (targetX - this.camera.x) * 0.08;
    this.camera.y += (targetY - this.camera.y) * 0.08;
    this.camera.x = Math.max(0, Math.min(WORLD_SIZE - this.viewport.w, this.camera.x));
    this.camera.y = Math.max(0, Math.min(WORLD_SIZE - this.viewport.h, this.camera.y));

    // Bots AI
    this.bots.forEach(bot => {
      if (bot.dashState) {
          resolveCollisions(bot);
          bot.x = Math.max(0, Math.min(WORLD_SIZE, bot.x));
          bot.y = Math.max(0, Math.min(WORLD_SIZE, bot.y));
          return;
      }

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
        resolveCollisions(bot);
        bot.x = Math.max(0, Math.min(WORLD_SIZE, bot.x));
        bot.y = Math.max(0, Math.min(WORLD_SIZE, bot.y));
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
    const ammoIndicator = document.getElementById('ammo-indicator');

    if (ammoIndicator) {
        ammoIndicator.innerHTML = '';
        for (let i = 0; i < this.player.maxAmmo; i++) {
            let fillPercent = 0;
            if (i < this.player.ammo) fillPercent = 100;
            else if (i === this.player.ammo) fillPercent = (this.player.reloadTimer / this.player.config.reloadTime) * 100;
            
            ammoIndicator.innerHTML += `
               <div class="h-full flex-1 bg-slate-900 border border-black/50 rounded-sm overflow-hidden shadow-sm">
                   <div class="h-full bg-orange-500 transition-all duration-75" style="width: ${fillPercent}%"></div>
               </div>
            `;
        }
    }

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
      if (b.duration && b.createdAt && now - b.createdAt > b.duration) { this.bullets.splice(i, 1); continue; }
      
      b.x += b.dx; b.y += b.dy;
      b.rangeRemaining -= Math.hypot(b.dx, b.dy);
      if (b.rangeRemaining <= 0) {
        if (b.type === 'spike') {
          if (b.isSuper) this.zones.push({ id: Math.random().toString(), ownerId: b.ownerId, x: b.x, y: b.y, radius: 120, duration: 4000, createdAt: now, damage: 400 });
          else for(let j=0; j<6; j++) {
            const ang = (j/6)*Math.PI*2;
            this.bullets.push({ ...b, id: b.id+j, dx: Math.cos(ang)*4, dy: Math.sin(ang)*4, rangeRemaining: 100, damage: b.damage*0.4, type: 'shelly' });
          }
        } else if (b.type === 'tick') {
            b.dx = 0; b.dy = 0;
            b.rangeRemaining = 99999;
            b.createdAt = now;
            b.duration = b.isSuper ? 6000 : 2000;
            b.type = 'tick_mine';
            continue;
        }
        if (b.type !== 'tick_mine') this.bullets.splice(i, 1);
        continue;
      }

      let hitWallIndex = -1;
      for (let j = 0; j < this.walls.length; j++) {
        const w = this.walls[j];
        let testX = b.x;
        let testY = b.y;
        if (b.x < w.x) testX = w.x; else if (b.x > w.x + w.width) testX = w.x + w.width;
        if (b.y < w.y) testY = w.y; else if (b.y > w.y + w.height) testY = w.y + w.height;
        let dist = Math.hypot(b.x - testX, b.y - testY);
        if (dist <= b.size) { hitWallIndex = j; break; }
      }
      
      if (hitWallIndex !== -1 && !(b.type === 'spike' && b.isSuper) && b.type !== 'tick' && b.type !== 'tick_mine') {
         if ((b.type === 'shelly' && b.isSuper) || (b.type === 'colt' && b.isSuper) || (b.type === 'griff' && b.isSuper) || (b.type === 'penny' && b.isSuper)) {
             this.walls.splice(hitWallIndex, 1);
         } else {
             b.id = 'deleted';
             this.bullets.splice(i, 1);
             continue;
         }
      }

      if (b.type === 'tick_mine') {
          const targets = [this.player!, ...this.bots].filter(t => t.id !== b.ownerId);
          for (const t of targets) {
              if (Math.hypot(t.x - b.x, t.y - b.y) < t.size + 40) {
                  t.hp -= b.damage;
                  t.lastCombatTime = now;
                  if (t.id === this.player?.id) this.player.lastCombatTime = now;
                  const shooter = [this.player!, ...this.bots].find(p => p.id === b.ownerId);
                  if (shooter) shooter.superCharge = Math.min(100, shooter.superCharge + 10);
                  b.id = 'deleted';
                  this.bullets.splice(i, 1);
                  break;
              }
          }
          if (b.id === 'deleted') continue;
      }

      [this.player!, ...this.bots, ...this.boxes.filter(bx => !bx.isDestroyed)].forEach(t => {
        if (t.id === b.ownerId || b.id === 'deleted' || (b.hitIds && b.hitIds.includes(t.id))) return;
        if (Math.hypot(b.x - t.x, b.y - t.y) < t.size) {
          t.hp -= b.damage;
          t.lastCombatTime = now;
          if (t.id === this.player?.id) this.player.lastCombatTime = now;
          
          if (b.hitIds) b.hitIds.push(t.id);
          const shooter = [this.player!, ...this.bots].find(p => p.id === b.ownerId);
          if (shooter && !t.id.startsWith('box')) shooter.superCharge = Math.min(100, shooter.superCharge + (b.damage / 30));
          
          if (b.type === 'penny' && !b.isSuper) {
              for(let pi = -1; pi <= 1; pi++) {
                  const ang = Math.atan2(b.dy, b.dx) + pi * 0.25;
                  this.bullets.push({
                      id: Math.random()+'', ownerId: b.ownerId,
                      x: t.x + Math.cos(ang)*20, y: t.y + Math.sin(ang)*20,
                      dx: Math.cos(ang)*20, dy: Math.sin(ang)*20,
                      damage: b.damage * 1.5, rangeRemaining: 150,
                      size: b.size, color: b.color, type: 'penny_splash'
                  });
              }
          }

          let pierce = false;
          if (b.type === 'colette' && b.isSuper) pierce = true;
          if (b.type === 'griff' && b.isSuper) pierce = true;
          
          if (!pierce) {
            b.id = 'deleted';
            this.bullets.splice(i, 1);
          }
        }
      });
    }

    // Cubs
    this.bots.forEach((b, idx) => { if (b.hp <= 0) { this.cubes.push({ id: b.id + 'c', x: b.x, y: b.y, size: 20, isCollected: false, createdAt: now }); this.bots.splice(idx, 1); } });
    this.boxes.forEach(b => { if (!b.isDestroyed && b.hp <= 0) { b.isDestroyed = true; this.cubes.push({ id: b.id + 'c', x: b.x, y: b.y, size: 20, isCollected: false, createdAt: now }); } });
    
    for (let i = this.cubes.length - 1; i >= 0; i--) {
        const c = this.cubes[i];
        [this.player!, ...this.bots].forEach(p => {
            if (Math.hypot(p.x - c.x, p.y - c.y) < p.size + c.size) {
                p.powerCubes++; p.maxHp += 400; // maxHp only, no current HP healing
                if (p.id === this.player?.id) {
                    const el = document.getElementById('cube-container');
                    if (el) {
                        el.classList.add('scale-125', '!bg-yellow-500');
                        setTimeout(() => el.classList.remove('scale-125', '!bg-yellow-500'), 150);
                    }
                }
                this.cubes.splice(i, 1);
            }
        });
    }
  }

  draw() {
    this.ctx.fillStyle = '#854d0e';
    this.ctx.fillRect(0, 0, this.viewport.w, this.viewport.h);
    
    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Floor
    for (let y = 0; y < WORLD_SIZE; y += 100) {
      if (y < this.camera.y - 100 || y > this.camera.y + this.viewport.h) continue;
      for (let x = 0; x < WORLD_SIZE; x += 100) {
        if (x < this.camera.x - 100 || x > this.camera.x + this.viewport.w) continue;
        this.ctx.fillStyle = ((x/100 + y/100) % 2 === 0) ? '#a16207' : '#854d0e';
        this.ctx.fillRect(x, y, 100, 100);
      }
    }

    // Aim Indicators
    if (this.state === 'GAME' && this.player) {
        const p = this.player;
        const isSuper = this.isAimingSuper;
        const range = isSuper ? p.config.range + 100 : p.config.range;
        const color = isSuper ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.15)';
        
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.angle);
        
        if (p.config.type === 'shelly') {
            const spread = isSuper ? 0.6 : 0.4;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, range, -spread/2, spread/2);
            this.ctx.closePath();
            this.ctx.fill();
        } else if (p.config.type === 'colt') {
            const width = isSuper ? 40 : 20;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, -width/2, range + (isSuper ? 200 : 0), width);
        } else if (p.config.type === 'spike') {
            if (isSuper) {
                this.ctx.strokeStyle = color;
                this.ctx.setLineDash([10, 5]);
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(400, 0);
                this.ctx.stroke();
                
                this.ctx.setLineDash([]);
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(400, 0, 120, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = color;
                this.ctx.fillRect(0, -10, p.config.range, 20);
            }
        } else if (p.config.type === 'colette') {
            const width = isSuper ? 60 : 30;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, -width/2, range, width);
        } else if (p.config.type === 'edgar') {
            if (isSuper) {
                this.ctx.strokeStyle = color;
                this.ctx.setLineDash([10, 5]);
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(400, 0);
                this.ctx.stroke();
                
                this.ctx.setLineDash([]);
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(400, 0, 60, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                const spread = 0.3;
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.arc(0, 0, range, -spread/2, spread/2);
                this.ctx.closePath();
                this.ctx.fill();
            }
        } else if (p.config.type === 'griff') {
            const spread = isSuper ? 0.8 : 0.4;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, range, -spread/2, spread/2);
            this.ctx.closePath();
            this.ctx.fill();
        } else if (p.config.type === 'penny') {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, -10, range, 20);
        } else if (p.config.type === 'darryl') {
            const spread = 0.5;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, range, -spread/2, spread/2);
            this.ctx.closePath();
            this.ctx.fill();
        } else if (p.config.type === 'tick') {
            this.ctx.strokeStyle = color;
            this.ctx.setLineDash([10, 5]);
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(range, 0);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(range, 0, 40, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    // Boundary
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 10;
    this.ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Walls
    this.walls.forEach(w => {
      this.ctx.fillStyle = '#475569';
      this.ctx.fillRect(w.x, w.y, w.width, w.height);
      this.ctx.fillStyle = '#64748b';
      this.ctx.fillRect(w.x + 10, w.y + 10, w.width - 20, w.height - 20);
    });

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
      this.ctx.shadowColor = '#60a5fa';
      this.ctx.shadowBlur = 10 + Math.sin((Date.now() - (c.createdAt || 0)) / 100) * 8;
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.beginPath(); this.ctx.arc(c.x, c.y, c.size, 0, Math.PI*2); this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });

    this.bullets.forEach(b => {
      this.ctx.fillStyle = b.color;
      if (b.type === 'tick_mine') {
          this.ctx.shadowColor = '#ef4444';
          this.ctx.shadowBlur = 15;
      }
      this.ctx.beginPath(); this.ctx.arc(b.x, b.y, b.size, 0, Math.PI*2); this.ctx.fill();
      this.ctx.shadowBlur = 0;
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
