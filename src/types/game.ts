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
}

export const BRAWLERS: Record<BrawlerType, BrawlerConfig> = {
  shelly: {
    type: 'shelly',
    name: 'Shelly',
    hp: 3600,
    damage: 300, // per shell
    speed: 4,
    range: 250,
    reloadTime: 1500,
    bulletSpeed: 10,
    bulletSize: 6,
    color: '#a855f7', // purple
    projectileType: 'spread',
    emoji: '🤠'
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
    color: '#ef4444', // red
    projectileType: 'burst',
    emoji: '🔫'
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
    color: '#22c55e', // green
    projectileType: 'single', // special explosion handled in logic
    emoji: '🌵'
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
}

export interface PowerCube extends Entity {
  isCollected: boolean;
}
