import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Zap, User } from 'lucide-react';
import { BrawlerConfig, BRAWLERS, Player, Box, Bullet, PowerCube, BrawlerType } from '../types/game';

interface ShowdownGameProps {
  playerBrawler: BrawlerConfig;
  onGameOver: (rank: number, cubes: number) => void;
}

const WORLD_SIZE = 2500;
const BOT_COUNT = 9;
const BOX_COUNT = 25;
const PLAYER_SIZE = 30;
const BOX_SIZE = 60;
const POWER_CUBE_SIZE = 20;

const ShowdownGame: React.FC<ShowdownGameProps> = ({ playerBrawler, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [powerCubesCount, setPowerCubesCount] = useState(0);
  const [playerHp, setPlayerHp] = useState(playerBrawler.hp);
  const [activePlayers, setActivePlayers] = useState(BOT_COUNT + 1);

  // Use refs for game state to avoid Re-render overhead
  const stateRef = useRef({
    player: null as Player | null,
    bots: [] as Player[],
    boxes: [] as Box[],
    bullets: [] as Bullet[],
    cubes: [] as PowerCube[],
    keys: {} as Record<string, boolean>,
    mouse: { x: 0, y: 0, down: false },
    lastTick: 0,
    startTime: Date.now(),
    gameOver: false,
    camera: { x: 0, y: 0 }
  });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setViewport({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Initialize Game
    const player: Player = {
      id: 'player',
      x: WORLD_SIZE / 2,
      y: WORLD_SIZE / 2,
      size: PLAYER_SIZE,
      hp: playerBrawler.hp,
      maxHp: playerBrawler.hp,
      powerCubes: 0,
      config: playerBrawler,
      isBot: false,
      lastShot: 0,
      angle: 0
    };

    const bots: Player[] = Array.from({ length: BOT_COUNT }).map((_, i) => {
      const brawlerTypes: BrawlerType[] = ['shelly', 'colt', 'spike'];
      const randomType = brawlerTypes[Math.floor(Math.random() * brawlerTypes.length)];
      const config = BRAWLERS[randomType];
      return {
        id: `bot-${i}`,
        x: Math.random() * (WORLD_SIZE - 200) + 100,
        y: Math.random() * (WORLD_SIZE - 200) + 100,
        size: PLAYER_SIZE,
        hp: config.hp,
        maxHp: config.hp,
        powerCubes: 0,
        config,
        isBot: true,
        lastShot: 0,
        angle: Math.random() * Math.PI * 2
      };
    });

    const boxes: Box[] = Array.from({ length: BOX_COUNT }).map((_, i) => ({
      id: `box-${i}`,
      x: Math.random() * (WORLD_SIZE - 400) + 200,
      y: Math.random() * (WORLD_SIZE - 400) + 200,
      size: BOX_SIZE,
      hp: 1500,
      maxHp: 1500,
      powerCubes: 0,
      isDestroyed: false
    }));

    stateRef.current.player = player;
    stateRef.current.bots = bots;
    stateRef.current.boxes = boxes;

    const handleKeyDown = (e: KeyboardEvent) => stateRef.current.keys[e.key.toLowerCase()] = true;
    const handleKeyUp = (e: KeyboardEvent) => stateRef.current.keys[e.key.toLowerCase()] = false;
    const handleMouseMove = (e: MouseEvent) => {
      stateRef.current.mouse.x = e.clientX;
      stateRef.current.mouse.y = e.clientY;
    };
    const handleMouseDown = () => stateRef.current.mouse.down = true;
    const handleMouseUp = () => stateRef.current.mouse.down = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    let animationId: number;
    const loop = (time: number) => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const shoot = (shooter: Player, targetX: number, targetY: number) => {
    const now = Date.now();
    if (now - shooter.lastShot < shooter.config.reloadTime) return;

    shooter.lastShot = now;
    const angle = Math.atan2(targetY - shooter.y, targetX - shooter.x);
    shooter.angle = angle;

    const spawnBullet = (ang: number) => {
      const bullet: Bullet = {
        id: Math.random().toString(36).substr(2, 9),
        ownerId: shooter.id,
        x: shooter.x,
        y: shooter.y,
        dx: Math.cos(ang) * shooter.config.bulletSpeed,
        dy: Math.sin(ang) * shooter.config.bulletSpeed,
        damage: shooter.config.damage * (1 + shooter.powerCubes * 0.1),
        rangeRemaining: shooter.config.range,
        size: shooter.config.bulletSize,
        color: shooter.config.color,
        type: shooter.config.type
      };
      stateRef.current.bullets.push(bullet);
    };

    if (shooter.config.projectileType === 'spread') {
      // 3 shells for Shelly
      for (let i = -1; i <= 1; i++) {
        spawnBullet(angle + (i * 0.2));
      }
    } else if (shooter.config.projectileType === 'burst') {
      // 4 rapid shots for Colt
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (stateRef.current.gameOver) return;
          spawnBullet(angle);
        }, i * 100);
      }
    } else {
      // Single shot for Spike
      spawnBullet(angle);
    }
  };

  const update = () => {
    const { player, bots, boxes, bullets, cubes, keys, mouse, camera } = stateRef.current;
    if (!player || stateRef.current.gameOver) return;

    // Player Movement
    let dx = 0;
    let dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      player.x += (dx / length) * player.config.speed;
      player.y += (dy / length) * player.config.speed;
    }

    // World Bounds
    player.x = Math.max(player.size, Math.min(WORLD_SIZE - player.size, player.x));
    player.y = Math.max(player.size, Math.min(WORLD_SIZE - player.size, player.y));

    // Camera follow (ensure we don't divide by zero or use uninitialized viewport)
    if (viewport.w > 0 && viewport.h > 0) {
      camera.x = player.x - viewport.w / 2;
      camera.y = player.y - viewport.h / 2;
    }

    // Player Rotation: Always face the mouse
    const worldMouseX = mouse.x + camera.x;
    const worldMouseY = mouse.y + camera.y;
    player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

    // Player Shooting
    if (mouse.down) {
      shoot(player, worldMouseX, worldMouseY);
    }

    // Update Bots
    bots.forEach(bot => {
      // Very simple AI: Find nearest target (player, other bot, or box)
      const targets = [player, ...bots.filter(b => b.id !== bot.id), ...boxes.filter(b => !b.isDestroyed)];
      let nearest = null;
      let minDist = 1000;

      targets.forEach(t => {
        const d = Math.hypot(t.x - bot.x, t.y - bot.y);
        if (d < minDist) {
          minDist = d;
          nearest = t;
        }
      });

      if (nearest) {
        const angle = Math.atan2(nearest.y - bot.y, nearest.x - bot.x);
        
        // Move towards if far, stay back if close
        if (minDist > bot.config.range * 0.7) {
          bot.x += Math.cos(angle) * bot.config.speed;
          bot.y += Math.sin(angle) * bot.config.speed;
        } else if (minDist < player.size * 5) {
          bot.x -= Math.cos(angle) * bot.config.speed;
          bot.y -= Math.sin(angle) * bot.config.speed;
        }

        // Shoot if in range
        if (minDist < bot.config.range) {
          shoot(bot, nearest.x, nearest.y);
        }

        bot.angle = angle;
      }

      bot.x = Math.max(bot.size, Math.min(WORLD_SIZE - bot.size, bot.x));
      bot.y = Math.max(bot.size, Math.min(WORLD_SIZE - bot.size, bot.y));
    });

    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.dx;
      b.y += b.dy;
      const dist = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
      b.rangeRemaining -= dist;

      if (b.rangeRemaining <= 0) {
        // Spike explosion logic
        if (b.type === 'spike') {
             for(let j=0; j<6; j++) {
                const ang = (j / 6) * Math.PI * 2;
                bullets.push({
                   ...b,
                   id: b.id + '-shard-' + j,
                   dx: Math.cos(ang) * (b.dx * 0.5),
                   dy: Math.sin(ang) * (b.dy * 0.5),
                   rangeRemaining: 100,
                   damage: b.damage * 0.4,
                   type: 'shelly' // prevent recursing
                });
             }
        }
        bullets.splice(i, 1);
        continue;
      }

      // Check Hits
      const possibleTargets = [player, ...bots, ...boxes.filter(bx => !bx.isDestroyed)];
      for (const target of possibleTargets) {
        if (target.id === b.ownerId) continue;
        const distToTarget = Math.hypot(b.x - target.x, b.y - target.y);
        if (distToTarget < target.size) {
          target.hp -= b.damage;
          bullets.splice(i, 1);
          break;
        }
      }
    }

    // Resolve Deaths
    for (let i = bots.length - 1; i >= 0; i--) {
      if (bots[i].hp <= 0) {
        // Drop power cube
        cubes.push({
            id: `cube-bot-${bots[i].id}`,
            x: bots[i].x,
            y: bots[i].y,
            size: POWER_CUBE_SIZE,
            hp: 0, maxHp: 0, powerCubes: 0,
            isCollected: false
        });
        bots.splice(i, 1);
        setActivePlayers(bots.length + 1);
      }
    }
    
    // Check boxes destruction
    boxes.forEach(box => {
        if (!box.isDestroyed && box.hp <= 0) {
            box.isDestroyed = true;
            cubes.push({
                id: `cube-${box.id}`,
                x: box.x,
                y: box.y,
                size: POWER_CUBE_SIZE,
                hp: 0, maxHp: 0, powerCubes: 0,
                isCollected: false
            });
        }
    });

    // Collect Cubes
    for (let i = cubes.length - 1; i >= 0; i--) {
        const c = cubes[i];
        if (c.isCollected) continue;

        const pDist = Math.hypot(player.x - c.x, player.y - c.y);
        if (pDist < player.size + c.size) {
            player.powerCubes++;
            player.hp += 400;
            player.maxHp += 400;
            setPowerCubesCount(player.powerCubes);
            c.isCollected = true;
            cubes.splice(i, 1);
            continue;
        }

        for (const bot of bots) {
            const bDist = Math.hypot(bot.x - c.x, bot.y - c.y);
            if (bDist < bot.size + c.size) {
                bot.powerCubes++;
                bot.hp += 400;
                bot.maxHp += 400;
                c.isCollected = true;
                cubes.splice(i, 1);
                break;
            }
        }
    }

    setPlayerHp(player.hp);

    if (player.hp <= 0) {
      stateRef.current.gameOver = true;
      onGameOver(bots.length + 1, player.powerCubes);
    } else if (bots.length === 0) {
      stateRef.current.gameOver = true;
      onGameOver(1, player.powerCubes);
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { player, bots, boxes, bullets, cubes, camera } = stateRef.current;
    if (!player) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const startGridX = Math.floor(camera.x / 100) * 100;
    const startGridY = Math.floor(camera.y / 100) * 100;
    for (let x = startGridX; x < startGridX + viewport.w + 100; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x - camera.x, 0);
      ctx.lineTo(x - camera.x, viewport.h);
      ctx.stroke();
    }
    for (let y = startGridY; y < startGridY + viewport.h + 100; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y - camera.y);
      ctx.lineTo(viewport.w, y - camera.y);
      ctx.stroke();
    }

    // Draw World Boundary
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 10;
    ctx.strokeRect(-camera.x, -camera.y, WORLD_SIZE, WORLD_SIZE);

    // Draw Cubes
    cubes.forEach(c => {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(c.x - camera.x, c.y - camera.y, c.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', c.x - camera.x, c.y - camera.y + 5);
    });

    // Draw Boxes
    boxes.forEach(box => {
        if (box.isDestroyed) return;
        ctx.fillStyle = '#b45309';
        ctx.fillRect(box.x - camera.x - box.size/2, box.y - camera.y - box.size/2, box.size, box.size);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 4;
        ctx.strokeRect(box.x - camera.x - box.size/2, box.y - camera.y - box.size/2, box.size, box.size);
        
        // Box HP
        const barW = box.size;
        ctx.fillStyle = '#451a03';
        ctx.fillRect(box.x - camera.x - barW/2, box.y - camera.y - box.size/2 - 15, barW, 6);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(box.x - camera.x - barW/2, box.y - camera.y - box.size/2 - 15, barW * (box.hp / box.maxHp), 6);
    });

    // Draw Bullets
    bullets.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x - camera.x, b.y - camera.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Entities (Player & Bots)
    [player, ...bots].forEach(entity => {
      const isPlayer = entity.id === 'player';
      
      // HP Bar
      const barW = 60;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(entity.x - camera.x - barW/2, entity.y - camera.y - entity.size - 25, barW, 8);
      ctx.fillStyle = isPlayer ? '#22c55e' : '#ef4444';
      ctx.fillRect(entity.x - camera.x - barW/2, entity.y - camera.y - entity.size - 25, barW * (entity.hp / entity.maxHp), 8);
      
      // Name & Cubes
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ ${entity.powerCubes}`, entity.x - camera.x, entity.y - camera.y - entity.size - 30);

      // Character
      ctx.save();
      ctx.translate(entity.x - camera.x, entity.y - camera.y);
      ctx.rotate(entity.angle);
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, entity.size, entity.size * 0.8, entity.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = entity.config.color;
      ctx.beginPath();
      ctx.arc(0, 0, entity.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Direction
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(entity.size * 0.5, -5, 10, 10);
      
      ctx.restore();

      // Emoji Overlay (not rotated)
      ctx.font = '24px Arial';
      ctx.fillText(entity.config.emoji, entity.x - camera.x, entity.y - camera.y + 8);
    });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 cursor-crosshair">
      <canvas
        ref={canvasRef}
        width={viewport.w}
        height={viewport.h}
        className="block"
      />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 flex gap-4 pointer-events-none">
        <div className="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border-2 border-yellow-400 flex items-center gap-2">
            <Zap className="text-yellow-400" size={20} fill="currentColor" />
            <span className="text-2xl font-black italic">{powerCubesCount}</span>
        </div>
        <div className="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border-2 border-slate-700 flex items-center gap-2">
            <User className="text-slate-400" size={20} />
            <span className="text-2xl font-black italic">{activePlayers}</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 pointer-events-none">
        <div className="h-4 bg-black/50 rounded-full border-2 border-white/20 overflow-hidden shadow-lg">
            <motion.div 
                className="h-full bg-green-500"
                initial={{ width: '100%' }}
                animate={{ width: `${(playerHp / (playerBrawler.hp + powerCubesCount * 400)) * 100}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
            />
        </div>
        <div className="text-center text-xs font-bold uppercase mt-2 drop-shadow-md">
            HP {Math.max(0, Math.round(playerHp))} / {playerBrawler.hp + powerCubesCount * 400}
        </div>
      </div>

      <div className="absolute top-4 right-4 text-xs opacity-50 font-bold uppercase">
        Move: WASD | Shoot: Click
      </div>
    </div>
  );
};

export default ShowdownGame;
