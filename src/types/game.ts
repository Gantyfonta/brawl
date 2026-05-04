export type BrawlerType = 'shelly' | 'colt' | 'spike' | 'colette' | 'edgar' | 'griff' | 'penny' | 'darryl' | 'tick';

export interface BrawlerConfig {
  name: string;
  type: BrawlerType;
  emoji: string;
  hp: number;
  speed: number;
  reloadTime: number;
  damage: number;
  range: number;
  bulletSpeed: number;
  bulletSize: number;
  color: string;
}

export const BRAWLERS: Record<BrawlerType, BrawlerConfig> = {
  shelly: {
    name: "Shelly", type: "shelly", emoji: "🤠", hp: 3600, speed: 4, reloadTime: 1500, damage: 300, range: 400, bulletSpeed: 10, bulletSize: 10, color: "#8b5cf6"
  },
  colt: {
    name: "Colt", type: "colt", emoji: "🔫", hp: 2800, speed: 4, reloadTime: 1600, damage: 450, range: 600, bulletSpeed: 12, bulletSize: 8, color: "#ec4899"
  },
  spike: {
    name: "Spike", type: "spike", emoji: "🌵", hp: 2400, speed: 4, reloadTime: 2000, damage: 560, range: 500, bulletSpeed: 9, bulletSize: 12, color: "#22c55e"
  },
  colette: {
    name: "Colette", type: "colette", emoji: "📖", hp: 3400, speed: 4, reloadTime: 1600, damage: 500, range: 550, bulletSpeed: 11, bulletSize: 9, color: "#f43f5e"
  },
  edgar: {
    name: "Edgar", type: "edgar", emoji: "🧣", hp: 3000, speed: 5.5, reloadTime: 1000, damage: 540, range: 150, bulletSpeed: 15, bulletSize: 20, color: "#1e1b4b"
  },
  griff: {
    name: "Griff", type: "griff", emoji: "💰", hp: 3400, speed: 4, reloadTime: 1700, damage: 260, range: 450, bulletSpeed: 11, bulletSize: 10, color: "#eab308"
  },
  penny: {
    name: "Penny", type: "penny", emoji: "🏴‍☠️", hp: 3200, speed: 4, reloadTime: 1800, damage: 900, range: 550, bulletSpeed: 10, bulletSize: 10, color: "#fb7185"
  },
  darryl: {
    name: "Darryl", type: "darryl", emoji: "🛢️", hp: 5000, speed: 4, reloadTime: 1800, damage: 240, range: 350, bulletSpeed: 10, bulletSize: 12, color: "#0ea5e9"
  },
  tick: {
    name: "Tick", type: "tick", emoji: "💣", hp: 2200, speed: 4, reloadTime: 2200, damage: 640, range: 600, bulletSpeed: 8, bulletSize: 10, color: "#9ca3af"
  }
};

export interface Player {
  id: string;
  config: BrawlerConfig;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo?: number;
  reloadTimer: number;
  superCharge: number;
  powerCubes: number;
  size: number;
  lastCombatTime?: number;
  isBot?: boolean;
  lastShot?: number;
  lastSuper?: number;
  angle?: number;
  dashState?: {
    endX?: number;
    endY?: number;
    duration?: number;
    elapsed?: number;
    hitIds?: string[];
    origin?: {x: number; y: number;};
    target?: {x: number; y: number;};
    speed?: number;
    return?: boolean;
    isBounce?: boolean;
  };
}

export interface Box {
  id: string;
  x: number;
  y: number;
  size: number;
  hp: number;
  maxHp: number;
  powerCubes: number;
  isDestroyed: boolean;
  lastCombatTime?: number;
}

export interface PowerCube {
  id: string;
  x: number;
  y: number;
  size: number;
  isCollected?: boolean;
  createdAt?: number;
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
  type: string;
  isSuper?: boolean;
  hitIds?: string[]; // mainly for piercing attacks / tick mines
  duration?: number;
  createdAt?: number;
}

export interface Zone {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  size: number;
  radius: number;
  duration: number;
  createdAt: number;
  damage: number;
}
