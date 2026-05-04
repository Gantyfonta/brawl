export type BrawlerType = 'shelly' | 'colt' | 'spike' | 'colette' | 'edgar' | 'griff' | 'penny' | 'darryl' | 'tick';

export interface BrawlerConfig {
  type: BrawlerType;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  range: number;
  reloadTime: number;
  bulletSpeed: number;
  bulletSize: number;
  color: string;
  projectileType: 'single' | 'spread' | 'burst';
  emoji: string;
  superDescription: string;
}

export const BRAWLERS: Record<BrawlerType, BrawlerConfig> = {
  shelly: {
    type: 'shelly',
    name: 'Shelly',
    hp: 3600,
    damage: 300, // per pellet
    speed: 4.5,
    range: 350,
    reloadTime: 1500,
    bulletSpeed: 15,
    bulletSize: 8,
    color: '#8b5cf6',
    projectileType: 'spread',
    emoji: '🤠',
    superDescription: 'Super Shell: Devastating wide blast that breaks covers'
  },
  colt: {
    type: 'colt',
    name: 'Colt',
    hp: 2800,
    damage: 320, // per bullet
    speed: 4.5,
    range: 450,
    reloadTime: 1700,
    bulletSpeed: 20,
    bulletSize: 5,
    color: '#ef4444',
    projectileType: 'burst',
    emoji: '🔫',
    superDescription: 'Bullet Storm: Long range barrage that destroys cover'
  },
  spike: {
    type: 'spike',
    name: 'Spike',
    hp: 2400,
    damage: 560, // main hit
    speed: 4,
    range: 400,
    reloadTime: 2000,
    bulletSpeed: 12,
    bulletSize: 10,
    color: '#22c55e',
    projectileType: 'single',
    emoji: '🌵',
    superDescription: 'Stick Around: Slowing and damaging area of effect'
  },
  colette: {
    type: 'colette',
    name: 'Colette',
    hp: 3400,
    damage: 1000,
    speed: 4,
    range: 350,
    reloadTime: 1600,
    bulletSpeed: 16,
    bulletSize: 6,
    color: '#f472b6',
    projectileType: 'single',
    emoji: '📖',
    superDescription: 'Time to Collect: Dash forward and back, dealing damage'
  },
  edgar: {
    type: 'edgar',
    name: 'Edgar',
    hp: 3300,
    damage: 540,
    speed: 5.5,
    range: 150,
    reloadTime: 700,
    bulletSpeed: 18,
    bulletSize: 12,
    color: '#312e81',
    projectileType: 'burst',
    emoji: '🧣',
    superDescription: 'Vault: Leap instantly to a target location'
  },
  griff: {
    type: 'griff',
    name: 'Griff',
    hp: 3400,
    damage: 260,
    speed: 4,
    range: 300,
    reloadTime: 1700,
    bulletSpeed: 14,
    bulletSize: 5,
    color: '#eab308',
    projectileType: 'spread',
    emoji: '💰',
    superDescription: 'Cashback: Throw returning banknotes that pierce'
  },
  penny: {
    type: 'penny',
    name: 'Penny',
    hp: 3200,
    damage: 900,
    speed: 4.5,
    range: 350,
    reloadTime: 1800,
    bulletSpeed: 15,
    bulletSize: 10,
    color: '#f59e0b',
    projectileType: 'single',
    emoji: '🏴‍☠️',
    superDescription: 'Plunder: Massive bag of coins with splash damage'
  },
  darryl: {
    type: 'darryl',
    name: 'Darryl',
    hp: 5300,
    damage: 240,
    speed: 5,
    range: 200,
    reloadTime: 1400,
    bulletSpeed: 18,
    bulletSize: 6,
    color: '#3b82f6',
    projectileType: 'spread',
    emoji: '🛢️',
    superDescription: 'Roll: Dash forward knocking back enemies'
  },
  tick: {
    type: 'tick',
    name: 'Tick',
    hp: 2200,
    damage: 640,
    speed: 4,
    range: 400,
    reloadTime: 2200,
    bulletSpeed: 12,
    bulletSize: 12,
    color: '#9ca3af',
    projectileType: 'spread',
    emoji: '💣',
    superDescription: 'Headfirst: Throws a massive long-lasting mine'
  }
};

export interface Entity {
  id: string;
  x: number;
  y: number;
  size: number;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  powerCubes: number;
  config: BrawlerConfig;
  isBot: boolean;
  lastShot: number;
  angle: number;
  superCharge: number; // 0 to 100
  lastSuper: number;
  ammo: number;
  maxAmmo: number;
  reloadTimer: number;
  lastCombatTime: number;
  dashState?: {
    target: { x: number, y: number };
    origin: { x: number, y: number };
    return: boolean;
    isBounce: boolean;
    speed: number;
    hitIds: string[];
  };
}

export interface Box extends Entity {
  hp: number;
  maxHp: number;
  powerCubes: number;
  isDestroyed: boolean;
}

export interface PowerCube extends Entity {
  isCollected: boolean;
  createdAt: number;
}

export interface Bullet extends Entity {
  ownerId: string;
  dx: number;
  dy: number;
  damage: number;
  rangeRemaining: number;
  color: string;
  type: string;
  isSuper?: boolean;
  hitIds?: string[];
  duration?: number;
  createdAt?: number;
}

export interface Zone extends Entity {
  ownerId: string;
  radius: number;
  duration: number;
  createdAt: number;
  damage: number;
}
