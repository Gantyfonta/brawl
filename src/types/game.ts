export type BrawlerType = 'shelly' | 'colt' | 'spike';

export interface BrawlerConfig {
  type: BrawlerType;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  range: number;
  reloadTime: number; // ms
  bulletSpeed: number;
  bulletSize: number;
  color: string;
  projectileType: 'spread' | 'single' | 'burst';
  emoji: string;
  superDescription: string;
}

export const BRAWLERS: Record<BrawlerType, BrawlerConfig> = {
  shelly: {
    type: 'shelly',
    name: 'Shelly',
    hp: 3600,
    damage: 300,
    speed: 4,
    range: 250,
    reloadTime: 1500,
    bulletSpeed: 10,
    bulletSize: 6,
    color: '#a855f7',
    projectileType: 'spread',
    emoji: '🤠',
    superDescription: 'Super Shell: A wide blast that destroys everything'
  },
  colt: {
    type: 'colt',
    name: 'Colt',
    hp: 2800,
    damage: 400,
    speed: 4.2,
    range: 450,
    reloadTime: 1200,
    bulletSpeed: 14,
    bulletSize: 4,
    color: '#ef4444',
    projectileType: 'burst',
    emoji: '🔫',
    superDescription: 'Bullet Storm: Long range armor-piercing burst'
  },
  spike: {
    type: 'spike',
    name: 'Spike',
    hp: 2400,
    damage: 600,
    speed: 3.8,
    range: 350,
    reloadTime: 1800,
    bulletSpeed: 8,
    bulletSize: 10,
    color: '#22c55e',
    projectileType: 'single',
    emoji: '🌵',
    superDescription: 'Stick Around: Slowing and damaging area of effect'
  }
};

export interface Entity {
  id: string;
  x: number;
  y: number;
  size: number;
  hp: number;
  maxHp: number;
  powerCubes: number;
}

export interface Player extends Entity {
  config: BrawlerConfig;
  targetX?: number;
  targetY?: number;
  isBot: boolean;
  lastShot: number;
  angle: number;
  superCharge: number; // 0 to 100
  lastSuper: number;
}

export interface Box extends Entity {
  isDestroyed: boolean;
}

export interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  damage: number;
  rangeRemaining: number;
  size: number;
  color: string;
  type: BrawlerType;
  isSuper?: boolean;
}

export interface Zone {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  radius: number;
  duration: number; // ms
  createdAt: number;
  damage: number;
}

export interface PowerCube extends Entity {
  isCollected: boolean;
}
