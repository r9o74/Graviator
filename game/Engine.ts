import { Vector2 } from './Vector2.ts';
import { InputState, GameState, GameStats } from '../types.ts';

// Constants
const PLAYER_RADIUS = 12.0;
const ENTITY_MASS = 10.0;
const GRAVITY_CONSTANT = 45000.0;
const GRAVITY_MAX = 300000.0;
const THRUST_FORCE = 1500.0;
const CPU_THRUST_FORCE = 1800.0;
const BREAKING_CONSTANT = 2;
const WALL_MARGIN = 150;
const BREAK_BOOST = 25;
const ENEMY_NUMBER = 7;
const SAFE_DISTANCE = 150;
const DIST_EXP = 0.87;
const G_LINE_WIDTH = 1;
const TRAIL_WIDTH = PLAYER_RADIUS / 1.8;

const BASE_LOGICAL_SIZE = 800;
const TRAIL_LENGTH = 150;
const COLOR_PLAYER = '#00F0FF';
const COLOR_ENEMY = '#FF0055';
const COLOR_PARTICLE = '#FFFFFF';

const PARTICLE_PHYSICAL_RADIUS = 1.5; 
const LABEL_PHYSICAL_FONT_SIZE = 14;

class Particle {
    pos: Vector2;
    vel: Vector2;
    life: number;
    maxLife: number;
    color: string;

    constructor(x: number, y: number, vel: Vector2, color: string = COLOR_PARTICLE, lifeMultiplier: number = 1.0) {
        this.pos = new Vector2(x, y);
        this.vel = vel;
        this.life = 1.0;
        this.maxLife = (0.2 + Math.random() * 0.4) * lifeMultiplier;
        this.color = color;
    }

    update(dt: number) {
        this.pos = this.pos.add(this.vel.scale(dt));
        this.life -= dt / this.maxLife;
    }

    draw(ctx: CanvasRenderingContext2D, scaleFactor: number) {
        ctx.globalAlpha = Math.max(0, this.life) * 0.9;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const radius = PARTICLE_PHYSICAL_RADIUS / Math.pow(scaleFactor, 0.7);
        ctx.arc(this.pos.x, this.pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

class Entity {
    pos: Vector2;
    vel: Vector2;
    acc: Vector2;
    radius: number;
    mass: number;
    color: string;
    isPlayer: boolean;
    isCpu: boolean;
    breakingValue: number; 
    trail: Vector2[];

    constructor(x: number, y: number, isPlayer: boolean) {
        this.pos = new Vector2(x, y);
        this.vel = new Vector2();
        this.acc = new Vector2();
        this.radius = PLAYER_RADIUS;
        this.mass = ENTITY_MASS;
        this.isPlayer = isPlayer;
        this.isCpu = !isPlayer;
        this.color = isPlayer ? COLOR_PLAYER : COLOR_ENEMY;
        this.breakingValue = 0;
        this.trail = [];
    }

    applyForce(force: Vector2) {
        this.acc = this.acc.add(force.scale(1 / this.mass));
    }

    update(dt: number) {
        this.vel = this.vel.add(this.acc.scale(dt));
        this.pos = this.pos.add(this.vel.scale(dt));
        this.acc = new Vector2();

        if (this.trail.length > TRAIL_LENGTH) {
            this.trail.shift();
        }
        this.trail.push(this.pos.clone());
    }

    draw(ctx: CanvasRenderingContext2D, scaleFactor: number) {
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                const point = this.trail[i];
                ctx.lineTo(point.x, point.y);
            }
            const gradient = ctx.createLinearGradient(this.trail[0].x, this.trail[0].y, this.pos.x, this.pos.y);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, this.color);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = TRAIL_WIDTH;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }

        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowColor = '#FFFFFF';
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        if (this.isPlayer) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            const fontSize = Math.round(LABEL_PHYSICAL_FONT_SIZE / scaleFactor);
            ctx.font = `${fontSize}px JetBrains Mono`;
            ctx.textAlign = 'center';
            ctx.fillText('YOU', this.pos.x, this.pos.y - (15 / scaleFactor));
        }
    }
}

export class GameEngine {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number = 0;
    height: number = 0;
    logicalWidth: number = 0;
    logicalHeight: number = 0;
    scaleFactor: number = 1;
    dpr: number = 1;
    entities: Entity[] = [];
    particles: Particle[] = [];
    gameState: GameState = GameState.MENU;
    input: InputState = { up: false, down: false, left: false, right: false };
    lastTime: number = 0;
    animationId: number = 0;
    startTime: number = 0;
    initialEnemyCount: number = ENEMY_NUMBER;
    maxSpeedRecorded: number = 0;
    maxGravityRecorded: number = 0;
    onStateChange: (state: GameState) => void;
    onStatsUpdate?: (stats: GameStats) => void;
    frameCount: number = 0;

    // Shake & Flash logic
    shakeIntensity: number = 0;
    shakeDecay: number = 0.9;
    flashOpacity: number = 0;
    flashColor: string = '#FFFFFF';

    constructor(canvas: HTMLCanvasElement, onStateChange: (state: GameState) => void, onStatsUpdate?: (stats: GameStats) => void) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        this.onStateChange = onStateChange;
        this.onStatsUpdate = onStatsUpdate;
        
        // Ensure parent is ready
        setTimeout(() => {
            this.resize();
            window.addEventListener('resize', () => this.resize());
        }, 100);
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (parent) {
            // Check if parent has size yet
            const w = parent.clientWidth || window.innerWidth;
            const h = parent.clientHeight || window.innerHeight;
            
            this.dpr = window.devicePixelRatio || 1;
            this.width = w;
            this.height = h;
            this.canvas.width = this.width * this.dpr;
            this.canvas.height = this.height * this.dpr;
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            
            this.ctx.resetTransform();
            this.ctx.scale(this.dpr, this.dpr);
            
            const minDimension = Math.min(this.width, this.height);
            this.scaleFactor = Math.max(0.1, minDimension / BASE_LOGICAL_SIZE);
            this.logicalWidth = this.width / this.scaleFactor;
            this.logicalHeight = this.height / this.scaleFactor;
        }
    }

    start() {
        this.resize(); // One more resize to be sure
        this.entities = [];
        this.particles = [];
        this.shakeIntensity = 0;
        this.flashOpacity = 0;
        this.startTime = Date.now();
        this.maxSpeedRecorded = 0;
        this.maxGravityRecorded = 0;
        
        const playerX = this.logicalWidth / 2;
        const playerY = this.logicalHeight / 2;
        this.entities.push(new Entity(playerX, playerY, true));
        
        const SAFE_DISTANCE_SQ = SAFE_DISTANCE * SAFE_DISTANCE;
        for (let i = 0; i < this.initialEnemyCount; i++) {
            let x = 0, y = 0, attempts = 0, validPosition = false;
            while (!validPosition && attempts < 20) {
                x = Math.random() * (this.logicalWidth - PLAYER_RADIUS * 2) + PLAYER_RADIUS;
                y = Math.random() * (this.logicalHeight - PLAYER_RADIUS * 2) + PLAYER_RADIUS;
                const distSq = Math.pow(x - playerX, 2) + Math.pow(y - playerY, 2);
                if (distSq >= SAFE_DISTANCE_SQ) validPosition = true;
                attempts++;
            }
            this.entities.push(new Entity(x, y, false));
        }
        
        this.setGameState(GameState.PLAYING);
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    setGameState(state: GameState) {
        const prevState = this.gameState;
        this.gameState = state;
        this.onStateChange(state);

        if (state === GameState.GAME_OVER && prevState === GameState.PLAYING) {
            this.shakeIntensity = 40; 
            this.shakeDecay = 0.92;
            this.flashOpacity = 0.8;
            this.flashColor = '#FF0000';
        } else if (state === GameState.VICTORY && prevState === GameState.PLAYING) {
            this.shakeIntensity = 20; 
            this.shakeDecay = 0.96;
            this.flashOpacity = 0.5;
            this.flashColor = '#00FFFF';
            this.triggerVictoryBurst();
        }
    }

    triggerVictoryBurst() {
        const player = this.entities.find(e => e.isPlayer);
        if (!player) return;
        const count = 500;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 600;
            const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            const color = i % 3 === 0 ? COLOR_PLAYER : (i % 3 === 1 ? '#FFFFFF' : '#00AACC');
            this.particles.push(new Particle(player.pos.x, player.pos.y, vel, color, 4.0));
        }
    }

    triggerEliminationEffect(entity: Entity) {
        const count = entity.isPlayer ? 500 : 600;
        const intensity = entity.isPlayer ? 40 : 50;
        
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.flashOpacity = entity.isPlayer ? 0.9 : 0.6;
        this.flashColor = entity.color;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 500;
            const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            this.particles.push(new Particle(entity.pos.x, entity.pos.y, vel, entity.color, 2.0));
        }
    }

    handleInput(input: InputState) {
        this.input = input;
    }

    spawnExhaust(entity: Entity, direction: Vector2, thrustMagnitude: number = 1.0) {
        const normDir = direction.normalize();
        const offset = normDir.scale(-entity.radius);
        const spread = 80 * Math.min(thrustMagnitude, 1);
        const speed = (150 + Math.random() * 100) * Math.min(thrustMagnitude, 1);
        const particleVel = normDir.scale(-speed).add(
            new Vector2((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)
        );
        const color = Math.random() > 0.8 ? '#FFFFFF' : entity.color;
        this.particles.push(new Particle(entity.pos.x + offset.x, entity.pos.y + offset.y, particleVel, color));
    }

    updateCpu(cpu: Entity) {
        if (!cpu.isCpu) return;
        let closestEntity = null, minDistanceSq = Infinity;
        for (const entity of this.entities) {
            if (entity === cpu) continue;
            const distSq = cpu.pos.subtract(entity.pos).lengthSquared();
            if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEntity = entity; }
        }
        const thrustDirection = new Vector2();
        if (closestEntity) {
            const target = closestEntity;
            const walls = { 'left': target.pos.x, 'right': this.logicalWidth - target.pos.x, 'top': target.pos.y, 'bottom': this.logicalHeight - target.pos.y };
            const nearestWall = Object.keys(walls).reduce((a, b) => (walls as any)[a] < (walls as any)[b] ? a : b);
            const PUSH_OFFSET = 50;
            let targetPosition = target.pos.clone();
            if (nearestWall === 'left') targetPosition.x += PUSH_OFFSET;
            else if (nearestWall === 'right') targetPosition.x -= PUSH_OFFSET;
            else if (nearestWall === 'top') targetPosition.y += PUSH_OFFSET;
            else if (nearestWall === 'bottom') targetPosition.y -= PUSH_OFFSET;
            const directionToTarget = targetPosition.subtract(cpu.pos).normalize();
            thrustDirection.x = directionToTarget.x;
            thrustDirection.y = directionToTarget.y;
        }
        const avoidanceForce = new Vector2();
        const avoidanceMargin = 50;
        if (cpu.pos.x < avoidanceMargin) avoidanceForce.x = 1;
        else if (cpu.pos.x > this.logicalWidth - avoidanceMargin) avoidanceForce.x = -1;
        if (cpu.pos.y < avoidanceMargin) avoidanceForce.y = 1;
        else if (cpu.pos.y > this.logicalHeight - avoidanceMargin) avoidanceForce.y = -1;
        if (avoidanceForce.length() > 0) cpu.applyForce(avoidanceForce.normalize().scale(2000));
        if (cpu.pos.x < WALL_MARGIN || cpu.pos.x > this.logicalWidth - WALL_MARGIN) {
            cpu.breakingValue = (WALL_MARGIN - Math.min(cpu.pos.x, this.logicalWidth - cpu.pos.x)) / BREAK_BOOST;
        } else if (cpu.pos.y < WALL_MARGIN || cpu.pos.y > this.logicalHeight - WALL_MARGIN) {
            cpu.breakingValue = (WALL_MARGIN - Math.min(cpu.pos.y, this.logicalHeight - cpu.pos.y)) / BREAK_BOOST;
        } else {
            cpu.breakingValue = 0;
        }
        if (thrustDirection.length() > 0) {
            let forceVector = thrustDirection.normalize().scale(CPU_THRUST_FORCE);
            if (cpu.vel.x * thrustDirection.x < 0) forceVector.x *= (BREAKING_CONSTANT + cpu.breakingValue);
            if (cpu.vel.y * thrustDirection.y < 0) forceVector.y *= (BREAKING_CONSTANT + cpu.breakingValue);
            cpu.applyForce(forceVector);
            if (Math.random() > 0.4) this.spawnExhaust(cpu, thrustDirection, 0.8);
        }
    }

    update(dt: number) {
        if (this.shakeIntensity > 0.1) this.shakeIntensity *= this.shakeDecay;
        else this.shakeIntensity = 0;
        
        if (this.flashOpacity > 0.01) this.flashOpacity *= 0.9;
        else this.flashOpacity = 0;

        if (this.gameState !== GameState.PLAYING) {
             this.particles.forEach(p => p.update(dt));
             this.particles = this.particles.filter(p => p.life > 0);
             return;
        }

        const player = this.entities.find(e => e.isPlayer);
        let playerTotalGravityForce = 0, minDangerDist = Infinity;
        
        if (player) {
            let thrustDirection = new Vector2();
            let magnitude = 0;
            if (this.input.vector && (Math.abs(this.input.vector.x) > 0.01 || Math.abs(this.input.vector.y) > 0.01)) {
                thrustDirection.x = this.input.vector.x; thrustDirection.y = this.input.vector.y;
                magnitude = thrustDirection.length();
            } else {
                if (this.input.left) thrustDirection.x -= 1;
                if (this.input.right) thrustDirection.x += 1;
                if (this.input.up) thrustDirection.y -= 1;
                if (this.input.down) thrustDirection.y += 1;
                magnitude = thrustDirection.length() > 0 ? 1.0 : 0;
            }

            if (player.pos.x < WALL_MARGIN || player.pos.x > this.logicalWidth - WALL_MARGIN) {
                const dist = Math.min(player.pos.x, this.logicalWidth - player.pos.x);
                player.breakingValue = (WALL_MARGIN - dist) / BREAK_BOOST;
                minDangerDist = Math.min(minDangerDist, dist);
            } else if (player.pos.y < WALL_MARGIN || player.pos.y > this.logicalHeight - WALL_MARGIN) {
                const dist = Math.min(player.pos.y, this.logicalHeight - player.pos.y);
                player.breakingValue = (WALL_MARGIN - dist) / BREAK_BOOST;
                minDangerDist = Math.min(minDangerDist, dist);
            } else {
                player.breakingValue = 0;
                minDangerDist = Math.min(player.pos.x, this.logicalWidth - player.pos.x, player.pos.y, this.logicalHeight - player.pos.y);
            }

            if (magnitude > 0) {
                const normDir = thrustDirection.normalize();
                let forceVector = normDir.scale(THRUST_FORCE * Math.min(magnitude, 1.0));
                if (player.vel.x * normDir.x < 0) forceVector.x *= (BREAKING_CONSTANT + player.breakingValue);
                if (player.vel.y * normDir.y < 0) forceVector.y *= (BREAKING_CONSTANT + player.breakingValue);
                player.applyForce(forceVector);
                const particlesToSpawn = Math.floor(Math.min(magnitude, 1) * 3);
                for(let i = 0; i < particlesToSpawn; i++) this.spawnExhaust(player, normDir, magnitude);
                if (Math.random() < (magnitude % 1)) this.spawnExhaust(player, normDir, magnitude);
            }
        }

        this.entities.forEach(e => { if (e.isCpu) this.updateCpu(e); });
        
        for (let i = 0; i < this.entities.length; i++) {
            for (let j = i + 1; j < this.entities.length; j++) {
                const A = this.entities[i], B = this.entities[j];
                const distVec = B.pos.subtract(A.pos), distSq = distVec.lengthSquared();
                if (distSq > 0) {
                    const forceMag = Math.min(GRAVITY_CONSTANT * (A.mass * B.mass) / (distSq ** DIST_EXP) , GRAVITY_MAX);
                    const forceVector = distVec.normalize().scale(forceMag);
                    A.applyForce(forceVector);
                    B.applyForce(forceVector.scale(-1));
                    if (A.isPlayer || B.isPlayer) {
                         playerTotalGravityForce += forceMag;
                         minDangerDist = Math.min(minDangerDist, Math.sqrt(distSq) - A.radius - B.radius);
                    }
                }
            }
        }

        this.entities.forEach(e => e.update(dt));
        
        this.entities.forEach(e => {
            if (e.pos.x < 0 || e.pos.x > this.logicalWidth || e.pos.y < 0 || e.pos.y > this.logicalHeight) {
                this.triggerEliminationEffect(e);
                if (e.isPlayer) this.setGameState(GameState.GAME_OVER);
            }
        });

        this.entities = this.entities.filter(e => e.pos.x > 0 && e.pos.x < this.logicalWidth && e.pos.y > 0 && e.pos.y < this.logicalHeight);
        
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => p.life > 0);

        if (player) {
            if (player.vel.length() > this.maxSpeedRecorded) this.maxSpeedRecorded = player.vel.length();
            if (playerTotalGravityForce > this.maxGravityRecorded) this.maxGravityRecorded = playerTotalGravityForce;
        }

        if (player && this.entities.length === 1 && this.gameState === GameState.PLAYING) this.setGameState(GameState.VICTORY);

        this.frameCount++;
        if (this.onStatsUpdate && player && this.frameCount % 5 === 0) {
             this.onStatsUpdate({
                 speed: player.vel.length(),
                 gravityForce: playerTotalGravityForce,
                 maxSpeed: this.maxSpeedRecorded,
                 maxGravity: this.maxGravityRecorded,
                 currentEnemies: this.entities.length - 1,
                 initialEnemies: this.initialEnemyCount,
                 timeSurvived: (Date.now() - this.startTime) / 1000,
                 dangerLevel: Math.max(0, 100 - (minDangerDist / 200) * 100)
             });
        }
    }

    draw() {
        if (!this.width || !this.height) return;

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.save();

        if (this.shakeIntensity > 0) {
            const sx = (Math.random() - 0.5) * this.shakeIntensity;
            const sy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(sx, sy);
        }

        this.ctx.scale(this.scaleFactor, this.scaleFactor);
        this.drawGrid();
        this.drawBoundaries(); 
        this.drawGravityLines(); 
        this.ctx.globalCompositeOperation = 'lighter';
        this.particles.forEach(p => p.draw(this.ctx, this.scaleFactor));
        this.entities.forEach(e => e.draw(this.ctx, this.scaleFactor));
        this.ctx.restore();

        if (this.flashOpacity > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.flashOpacity;
            this.ctx.fillStyle = this.flashColor;
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }

        this.ctx.globalCompositeOperation = 'source-over';
    }

    drawBoundaries() {
        const borderWidth = 20;
        const isGameOver = this.gameState === GameState.GAME_OVER;
        const colorBase = isGameOver ? '255, 0, 0' : '255, 0, 50';

        const gradient = this.ctx.createRadialGradient(this.logicalWidth/2, this.logicalHeight/2, Math.min(this.logicalWidth, this.logicalHeight) * 0.4, this.logicalWidth/2, this.logicalHeight/2, Math.max(this.logicalWidth, this.logicalHeight) * 0.8);
        gradient.addColorStop(0, `rgba(${colorBase}, 0)`);
        gradient.addColorStop(1, `rgba(${colorBase}, 0.1)`);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        
        this.ctx.shadowBlur = isGameOver ? 30 : 15;
        this.ctx.shadowColor = `rgba(${colorBase}, 0.6)`;
        this.ctx.strokeStyle = `rgba(${colorBase}, 0.5)`;
        this.ctx.lineWidth = borderWidth;
        this.ctx.strokeRect(0, 0, this.logicalWidth, this.logicalHeight);
        
        const cornerSize = 120;
        this.ctx.strokeStyle = isGameOver ? '#FF0000' : '#FF3333';
        this.ctx.lineWidth = 25;
        this.ctx.shadowColor = '#FF0000';
        this.ctx.shadowBlur = isGameOver ? 40 : 20;
        const drawCorner = (x: number, y: number, dx: number, dy: number) => {
             this.ctx.beginPath();
             this.ctx.moveTo(x + dx * cornerSize, y);
             this.ctx.lineTo(x, y);
             this.ctx.lineTo(x, y + dy * cornerSize);
             this.ctx.stroke();
        };
        drawCorner(0, 0, 1, 1);
        drawCorner(this.logicalWidth, 0, -1, 1);
        drawCorner(this.logicalWidth, this.logicalHeight, -1, -1);
        drawCorner(0, this.logicalHeight, 1, -1);
        this.ctx.shadowBlur = 0;
    }

    drawGrid() {
        const step = 70;
        const isGameOver = this.gameState === GameState.GAME_OVER;
        const offsetX = (Date.now() / (isGameOver ? 20 : 50)) % step;
        const offsetY = (Date.now() / (isGameOver ? 20 : 50)) % step;
        
        this.ctx.strokeStyle = isGameOver ? 'rgba(255, 0, 0, 0.4)' : 'rgba(255, 100, 255, 0.3)';
        this.ctx.lineWidth = 1 / this.scaleFactor;
        this.ctx.beginPath();
        for (let x = offsetX; x <= this.logicalWidth; x += step) { this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.logicalHeight); }
        for (let y = offsetY; y <= this.logicalHeight; y += step) { this.ctx.moveTo(0, y); this.ctx.lineTo(this.logicalWidth, y); }
        this.ctx.stroke();
    }

    drawGravityLines() {
        this.ctx.lineWidth = G_LINE_WIDTH / this.scaleFactor;
        for (let i = 0; i < this.entities.length; i++) {
            for (let j = i + 1; j < this.entities.length; j++) {
                const A = this.entities[i], B = this.entities[j];
                const dist = Vector2.distance(A.pos, B.pos);
                if (dist < 800) {
                    const opacity = Math.pow(1 - (dist / 800), 2) * 0.7;
                    const grad = this.ctx.createLinearGradient(A.pos.x, A.pos.y, B.pos.x, B.pos.y);
                    grad.addColorStop(0, `rgba(0, 240, 255, ${opacity})`);
                    grad.addColorStop(1, `rgba(255, 0, 85, ${opacity})`);
                    this.ctx.strokeStyle = grad;
                    this.ctx.beginPath(); this.ctx.moveTo(A.pos.x, A.pos.y); this.ctx.lineTo(B.pos.x, B.pos.y); this.ctx.stroke();
                }
            }
        }
    }

    loop(timestamp: number) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); 
        this.lastTime = timestamp;
        this.update(dt);
        this.draw();
        this.animationId = requestAnimationFrame((t) => this.loop(t));
    }

    stop() { cancelAnimationFrame(this.animationId); }
}