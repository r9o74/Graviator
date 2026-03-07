import { Vector2 } from './Vector2.ts';
import { InputState, GameState, GameStats, GameMode, Difficulty, ItemType } from '../types.ts';

import {
    IS_MOBILE,
    PLAYER_RADIUS, ENTITY_MASS, DEFAULT_GRAVITY_CONSTANT, DEFAULT_CPU_THRUST_FORCE, DEFAULT_ENEMY_NUMBER_SURVIVAL,
    GRAVITY_MAX, THRUST_FORCE, BREAKING_CONSTANT, WALL_MARGIN, BREAK_BOOST, SAFE_DISTANCE, DIST_EXP,
    G_LINE_WIDTH, TRAIL_WIDTH, FRICTION, FRICTION_VEL_EXP, BASE_LOGICAL_SIZE, TRAIL_LENGTH,
    COLOR_PLAYER, COLOR_ENEMY, COLOR_PARTICLE, COLOR_ITEM_MASS, COLOR_ITEM_SATELLITE, COLOR_ITEM_STEALTH,
    COLOR_ITEM_WAVE, COLOR_ITEM_INVERSION, COLOR_ITEM_REPULSIVE, COLOR_ITEM_CAPTURE,
    PARTICLE_PHYSICAL_RADIUS, LABEL_PHYSICAL_FONT_SIZE,
    ITEM_RADIUS, ITEM_AREA_RADIUS, ITEM_SPAWN_START_DELAY, ITEM_SPAWN_INTERVAL_MIN, ITEM_SPAWN_INTERVAL_MAX,
    item_ratio,
    POWERUP_DURATION, MASS_BOOST_MULTIPLIER,
    SATELLITE_MASS, SATELLITE_RADIUS, SATELLITE_THRUST, SATELLITE_NUM, SATELLITE_TRAIL_LENGTH,
    STEALTH_FADE_DURATION, STEALTH_INVIS_DURATION, STEALTH_TOTAL_DURATION, GRAVITY_REDUCTION,
    WAVE_SPEED, WAVE_FORCE, WAVE_DURATION, WAVE_INTERVAL, WAVE_WAITING, WAVE_MAX_RADIUS,
    INVERSION_DURATION, INVERSION_MULTIPLE_1, INVERSION_MULTIPLE_2,
    REPULSIVE_TRAIL_DURATION, REPULSIVE_TRAIL_RESTITUTION, REPULSIVE_TRAIL_RESTITUTION_TAN, TRAIL_LENGTH_EXTENDED,
    CAPTURE_DURATION, CAPTURE_RADIUS, CAPTURE_TIME_MASS, CAPTURE_TIME_STEALTH, CAPTURE_TIME_INVERSION,
    CAPTURE_TIME_TRAIL, CAPTURE_TIME_WAVE, CAPTURE_TIME_RAMJET,
    RAMJET_DURATION, RAMJET_FRONT_GAIN, RAMJET_REAR_GAIN, COLOR_ITEM_RAMJET_FRONT, COLOR_ITEM_RAMJET_REAR
} from '../constants/gameConfig.ts';

import { GravityWave } from './effects/GravityWave.ts';
import { VisualWave } from './effects/VisualWave.ts';
import { Particle } from './entities/Particle.ts';
import { Item } from './entities/Item.ts';
import { Entity, Point } from './entities/Entity.ts';































interface SpawnWarning {
    x: number;
    y: number;
    timer: number;
    isPlayer?: boolean;
}

// ゲームエンジンクラス：ゲーム全体の進行管理
export class GameEngine {
    canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D;
    // 画面サイズ関連
    width: number = 0; height: number = 0; 
    logicalWidth: number = 0; logicalHeight: number = 0; // 論理座標系（解像度に依存しない座標）
    logicalArea: number = 0;
    scaleFactor: number = 1; dpr: number = 1;
    
    // ゲームオブジェクト
    entities: Entity[] = []; 
    particles: Particle[] = []; 
    items: Item[] = []; 
    gravityWaves: GravityWave[] = []; 
    visualWaves: VisualWave[] = [];
    
    // 状態管理
    gameState: GameState = GameState.MENU; 
    gameMode: GameMode = GameMode.SURVIVAL;
    currentDifficulty: Difficulty = Difficulty.NORMAL; // 現在の難易度
    input: InputState = { up: false, down: false, left: false, right: false };
    
    // ループ管理
    lastTime: number = 0; animationId: number = 0; startTime: number = 0;
    survivalTime: number = 0; // 累積生存時間（一時停止考慮用）
    
    // 統計・スコア
    initialEnemyCount: number = DEFAULT_ENEMY_NUMBER_SURVIVAL; 
    maxSpeedRecorded: number = 0; maxGravityRecorded: number = 0; killCount: number = 0;
    
    // 現在の難易度設定値
    currentGravityConstant: number = DEFAULT_GRAVITY_CONSTANT;
    currentCpuThrust: number = DEFAULT_CPU_THRUST_FORCE;

    // コールバック
    onStateChange: (state: GameState) => void; 
    onStatsUpdate?: (stats: GameStats) => void;
    
    frameCount: number = 0; isLoopRunning: boolean = false; 
    spawnWarnings: SpawnWarning[] = []; // 出現予告マーカー
    
    // 画面効果
    shakeIntensity: number = 0; shakeDecay: number = 0.9; 
    flashOpacity: number = 0; flashColor: string = '#FFFFFF';
    private itemSpawnTimer: number = ITEM_SPAWN_START_DELAY;
    
    // チュートリアル状態
    tutorialStep: number = 0;
    tutorialTimer: number = 0;
    tutorial_step_show: string = "";
    tutorialMessage: string = "";
    tutorialObjectiveMet: boolean = false;
    tutorialMoveCount: number = 0;
    tutorialTarget: Vector2 | null = null;
    tutorialPhase: number = 0; // 0:Spawn, 1:Item, 2:Combat, 3:Return, 4:Transition, 5:Player
    tutorialDemoTimer: number = 0;

    private resizeHandler = () => this.resize();

    constructor(canvas: HTMLCanvasElement, onStateChange: (state: GameState) => void, onStatsUpdate?: (stats: GameStats) => void) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
        this.onStateChange = onStateChange; this.onStatsUpdate = onStatsUpdate;
        setTimeout(() => { this.resize(); window.addEventListener('resize', this.resizeHandler); }, 100);
    }

    // 画面サイズに合わせて論理座標系をスケーリング
    resize() {
        const parent = this.canvas.parentElement;
        if (parent) {
            const w = parent.clientWidth || window.innerWidth;
            const h = parent.clientHeight || window.innerHeight;
            this.dpr = window.devicePixelRatio || 1;
            this.width = w; this.height = h;
            this.canvas.width = this.width * this.dpr; this.canvas.height = this.height * this.dpr;
            this.canvas.style.width = `${this.width}px`; this.canvas.style.height = `${this.height}px`;
            this.ctx.resetTransform(); this.ctx.scale(this.dpr, this.dpr);
            const minDimension = Math.min(this.width, this.height);
            this.scaleFactor = Math.max(0.1, minDimension / BASE_LOGICAL_SIZE);
            this.logicalWidth = this.width / this.scaleFactor; this.logicalHeight = this.height / this.scaleFactor;
            this.logicalArea = this.logicalWidth * this.logicalHeight;
        }
    }

    // ゲーム開始処理
    async start(mode: GameMode = GameMode.SURVIVAL, difficulty: Difficulty = Difficulty.NORMAL) {
        this.resize(); 
        this.gameMode = mode;
        this.currentDifficulty = difficulty;

        // 難易度設定の適用
        if (mode === GameMode.TUTORIAL) {
            this.currentDifficulty = Difficulty.EASY; // チュートリアルはEASY固定
            this.currentGravityConstant = 35000.0;
            this.currentCpuThrust = 1000.0;
            // 敵の数はチュートリアルの進行管理で制御されるためここでは設定しない
        } else {
            switch (difficulty) {
                case Difficulty.EASY:
                    this.currentGravityConstant = 35000.0;
                    this.currentCpuThrust = 1200.0;
                    this.initialEnemyCount = 5;
                    break;
                case Difficulty.NORMAL:
                    this.currentGravityConstant = 40000.0;
                    this.currentCpuThrust = 1800.0;
                    this.initialEnemyCount = 10;
                    break;
                case Difficulty.HARD:
                    this.currentGravityConstant = 60000.0;
                    this.currentCpuThrust = 2800.0;
                    this.initialEnemyCount = 15;
                    break;
            }
        }

        // 初期化
        this.entities = []; this.particles = []; this.spawnWarnings = []; this.items = []; this.gravityWaves = []; this.visualWaves = [];
        this.shakeIntensity = 0; this.flashOpacity = 0; 
        
        // 1秒遅延して開始するための調整
        this.startTime = Date.now() + 1000; // 旧変数は念のため残すが、ロジックはsurvivalTimeを使用
        this.survivalTime = -1.0; 
        this.maxSpeedRecorded = 0; this.maxGravityRecorded = 0; this.killCount = 0; this.frameCount = 0;
        this.itemSpawnTimer = ITEM_SPAWN_START_DELAY + 1.0;
        
        // プレイヤーと敵のスポーン設定
        const playerX = this.logicalWidth / 2; 
        const playerY = this.logicalHeight / 2;
        
        // プレイヤー出現予告 (1.0秒後に出現)
        this.spawnWarnings.push({ x: playerX, y: playerY, timer: 1.0, isPlayer: true });
        
        // モードごとの初期配置
        if (mode === GameMode.TUTORIAL) {
            this.tutorialStep = 0;
            this.tutorialTimer = 0;
            this.tutorialObjectiveMet = false;
            this.tutorial_step_show = "";
            this.tutorialMessage = "初期化中...";
            this.tutorialMoveCount = 0;
            this.tutorialTarget = new Vector2(this.logicalWidth * 0.8, this.logicalHeight * 0.5);
            this.tutorialPhase = 0;
            this.tutorialDemoTimer = 0;
        } else {
            // 通常モードの敵配置（プレイヤーから一定距離離す）
            // エンドレスモードでも難易度に基づいて初期敵数を調整（NORMAL以上は5で固定、EASYは少なめに）
            const spawnCount = mode === GameMode.ENDLESS ? (difficulty === Difficulty.EASY ? 3 : difficulty === Difficulty.NORMAL ? 5 : 7) : this.initialEnemyCount;
            this.initialEnemyCount = spawnCount; // 統計用に保存

            const SAFE_DISTANCE_SQ = SAFE_DISTANCE * SAFE_DISTANCE;
            
            for (let i = 0; i < spawnCount; i++) {
                let x = 0;
                let y = 0;
                let valid = false;
                for (let attempt = 0; attempt < 20; attempt++) {
                    x = Math.random() * this.logicalWidth;
                    y = Math.random() * this.logicalHeight;
                    const dx = x - playerX;
                    const dy = y - playerY;
                    if (dx * dx + dy * dy > SAFE_DISTANCE_SQ) {
                        valid = true;
                        break;
                    }
                }
                if (!valid) { // フォールバック
                    x = (Math.random() < 0.5 ? 0 : this.logicalWidth);
                    y = Math.random() * this.logicalHeight;
                }
                this.spawnWarnings.push({ x, y, timer: 1.0, isPlayer: false });
            }
        }
        
        this.setGameState(GameState.PLAYING); this.lastTime = performance.now();
        this.emitStats();
        if (!this.isLoopRunning) {
            this.isLoopRunning = true;
            this.loop(this.lastTime);
        }
    }

    // ゲーム状態の変更とイベント発火
    setGameState(state: GameState) {
        const prevState = this.gameState; this.gameState = state; this.onStateChange(state);
        
        if (state === GameState.PLAYING && prevState === GameState.PAUSED) {
            this.lastTime = performance.now(); // タイムスタンプリセット
        }

        if (state === GameState.GAME_OVER && prevState === GameState.PLAYING) {
            this.shakeIntensity = 40; this.flashOpacity = 0.8; this.flashColor = '#FF0000';
        } else if (state === GameState.VICTORY && prevState === GameState.PLAYING) {
            this.shakeIntensity = 20; this.flashOpacity = 0.5; this.flashColor = '#00FFFF';
            this.triggerVictoryBurst();
        }
    }
    
    // 一時停止切り替え
    togglePause() {
        if (this.gameState === GameState.PLAYING) {
            this.setGameState(GameState.PAUSED);
        } else if (this.gameState === GameState.PAUSED) {
            this.setGameState(GameState.PLAYING);
        }
    }

    // 勝利時の演出
    triggerVictoryBurst() {
        const player = this.entities.find(e => e.isPlayer); if (!player) return;
        for (let i = 0; i < 500; i++) {
            const angle = Math.random() * Math.PI * 2; const speed = 50 + Math.random() * 600;
            const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            const color = i % 3 === 0 ? COLOR_PLAYER : (i % 3 === 1 ? '#FFFFFF' : '#00AACC');
            this.particles.push(new Particle(player.pos.x, player.pos.y, vel, color, 4.0));
        }
    }

    // エンティティ消滅時の演出
    triggerEliminationEffect(entity: Entity) {
        const count = entity.isPlayer ? 500 : (entity.isSatellite ? 50 : 600);
        const intensity = entity.isPlayer ? 60 : (entity.isSatellite ? 10 : 40);
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.flashOpacity = entity.isPlayer ? 0.9 : (entity.isSatellite ? 0.2 : 0.6);
        
        const baseColor = entity.color;
        for (let i = 0; i < count; i++) {
             const angle = Math.random() * Math.PI * 2;
             const speed = Math.random() * (entity.isPlayer ? 800 : 400);
             const life = (Math.random() * 0.5 + 0.5);
             const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed).add(entity.vel.scale(0.3));
             this.particles.push(new Particle(entity.pos.x, entity.pos.y, vel, baseColor, life, 1.5));
        }
    }

    handleInput(input: InputState) {
        this.input = input;
    }

    // 排気パーティクルの生成
    spawnExhaust(entity: Entity, direction: Vector2, thrustMagnitude: number = 1.0) {
        if (this.particles.length > 3000 || entity.stealthOpacity < 0.2) return;
        const normDir = direction.normalize(); const offset = normDir.scale(-entity.radius);
        const spread = 80 * Math.min(thrustMagnitude, 1); const speed = (150 + Math.random() * 100) * Math.min(thrustMagnitude, 1);
        const particleVel = normDir.scale(-speed).add(new Vector2((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread));
        const color = Math.random() > 0.8 ? '#FFFFFF' : entity.color;
        this.particles.push(new Particle(entity.pos.x + offset.x, entity.pos.y + offset.y, particleVel, color));
    }
    
    // 強奪スキル使用時の吸い込みエフェクト
    spawnCaptureStreamParticle(from: Entity, to: Entity, color: string) {
        const angle = Math.random() * Math.PI * 2;
        const dist = from.radius + 5 + Math.random() * 20;
        const startX = from.pos.x + Math.cos(angle) * dist;
        const startY = from.pos.y + Math.sin(angle) * dist;
        
        const dx = to.pos.x - startX;
        const dy = to.pos.y - startY;
        const len = Math.sqrt(dx*dx + dy*dy);
        const speed = 400 + Math.random() * 200; 
        
        if (len > 0) {
            const vel = new Vector2(dx/len * speed, dy/len * speed);
            // 粒子の大きさをランダムに変更 (0.5倍 ~ 1.2倍)
            const size = 0.5 + Math.random() * 0.7;
            this.particles.push(new Particle(startX, startY, vel, color, 0.4, size));
        }
    }
    
    // 能力強奪成功時のエフェクト
    spawnTransferParticles(from: Entity, to: Entity, color: string) {
        const count = 50;
        for (let i = 0; i < count; i++) {
            const t = Math.random();
            const startX = from.pos.x + (Math.random() - 0.5) * from.radius * 2;
            const startY = from.pos.y + (Math.random() - 0.5) * from.radius * 2;
            const dirX = to.pos.x - startX;
            const dirY = to.pos.y - startY;
            const dist = Math.sqrt(dirX*dirX + dirY*dirY);
            const vel = new Vector2(dirX/dist * 300, dirY/dist * 300);
            this.particles.push(new Particle(startX, startY, vel, color, 0.8));
        }
    }

    // 敵AIの更新処理
    updateCpu(cpu: Entity) {
        if (!cpu.isCpu) return;
        // 最も近いターゲットを探す
        let closestEntity = null, minDistanceSq = Infinity;
        for (const entity of this.entities) {
            if (entity === cpu || entity.owner === cpu || !entity.isTargetable()) continue; 
            const dx = cpu.pos.x - entity.pos.x; const dy = cpu.pos.y - entity.pos.y; const distSq = dx * dx + dy * dy;
            if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEntity = entity; }
        }
        const thrustDirection = new Vector2();
        if (closestEntity) {
            const target = closestEntity;
            const walls = { 'left': target.pos.x, 'right': this.logicalWidth - target.pos.x, 'top': target.pos.y, 'bottom': this.logicalHeight - target.pos.y };
            const nearestWall = Object.keys(walls).reduce((a, b) => (walls as any)[a] < (walls as any)[b] ? a : b);
            const PUSH_OFFSET = 50; let tx = target.pos.x; let ty = target.pos.y;
            if (nearestWall === 'left') tx += PUSH_OFFSET; else if (nearestWall === 'right') tx -= PUSH_OFFSET;
            else if (nearestWall === 'top') ty += PUSH_OFFSET; else if (nearestWall === 'bottom') ty -= PUSH_OFFSET;
            const dx = tx - cpu.pos.x; const dy = ty - cpu.pos.y; const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) { thrustDirection.x = dx / len; thrustDirection.y = dy / len; }
        }
        const avoidanceForce = new Vector2(); const avoidanceMargin = 50;
        if (cpu.pos.x < avoidanceMargin) avoidanceForce.x = 1; else if (cpu.pos.x > this.logicalWidth - avoidanceMargin) avoidanceForce.x = -1;
        if (cpu.pos.y < avoidanceMargin) avoidanceForce.y = 1; else if (cpu.pos.y > this.logicalHeight - avoidanceMargin) avoidanceForce.y = -1;
        if (avoidanceForce.length() > 0) cpu.applyForce(avoidanceForce.normalize().scale(2000));
        if (cpu.pos.x < WALL_MARGIN || cpu.pos.x > this.logicalWidth - WALL_MARGIN) {
            cpu.breakingValue = (WALL_MARGIN - Math.min(cpu.pos.x, this.logicalWidth - cpu.pos.x)) / BREAK_BOOST;
        } else if (cpu.pos.y < WALL_MARGIN || cpu.pos.y > this.logicalHeight - WALL_MARGIN) {
            cpu.breakingValue = (WALL_MARGIN - Math.min(cpu.pos.y, this.logicalHeight - cpu.pos.y)) / BREAK_BOOST;
        } else cpu.breakingValue = 0;
        
        // チュートリアル用の敵は動かない
        if (this.gameMode === GameMode.TUTORIAL) {
             // 最小限の壁回避のみ行う
             if (avoidanceForce.length() > 0) {
                 cpu.applyForce(avoidanceForce.normalize().scale(500));
             }
             return;
        }

        if (thrustDirection.length() > 0) {
            // 難易度に基づいた推力を使用
            let fx = thrustDirection.x * this.currentCpuThrust * cpu.thrustMultiplier; 
            let fy = thrustDirection.y * this.currentCpuThrust * cpu.thrustMultiplier;
            if (cpu.vel.x * thrustDirection.x < 0) fx *= (BREAKING_CONSTANT + cpu.breakingValue);
            if (cpu.vel.y * thrustDirection.y < 0) fy *= (BREAKING_CONSTANT + cpu.breakingValue);
            cpu.applyForce(new Vector2(fx, fy));
            if (Math.random() > 0.4) this.spawnExhaust(cpu, thrustDirection, 0.8 * cpu.thrustMultiplier);
        }
    }

    // 衛星の更新処理（親に追従し、敵へ突撃）
    updateSatellite(sat: Entity) {
        if (!sat.isSatellite || !sat.owner) return;
        let closestEnemy = null, minDistanceSq = Infinity;
        for (const entity of this.entities) {
            if (entity === sat.owner || entity.owner === sat.owner || entity.isSatellite || !entity.isTargetable()) continue;
            const dx = sat.pos.x - entity.pos.x; const dy = sat.pos.y - entity.pos.y; const distSq = dx * dx + dy * dy;
            if (distSq < minDistanceSq) { minDistanceSq = distSq; closestEnemy = entity; }
        }
        if (closestEnemy) {
            const dx = closestEnemy.pos.x - sat.pos.x; const dy = closestEnemy.pos.y - sat.pos.y; const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
                const tx = dx / len; const ty = dy / len;
                sat.applyForce(new Vector2(tx * SATELLITE_THRUST, ty * SATELLITE_THRUST));
                if (Math.random() > 0.6) this.spawnExhaust(sat, new Vector2(tx, ty), 0.5);
            }
        }
    }

    // チュートリアル用のAI操作
    updateTutorialAi(player: Entity, target: Entity | Vector2 | null, mode: 'CHASE' | 'RETURN') {
        if (!target) return;

        const targetPos = target instanceof Entity ? target.pos : target;
        
        // 基本的な推力方向の計算
        const thrustDirection = new Vector2();
        
        // ターゲットへの方向（壁際補正付き：updateCpuのロジックを流用）
        let tx = targetPos.x;
        let ty = targetPos.y;
        
        // ターゲットがEntityの場合は壁際補正を考慮（敵を壁に追い込む動き）
        if (target instanceof Entity) {
            const walls = { 'left': tx, 'right': this.logicalWidth - tx, 'top': ty, 'bottom': this.logicalHeight - ty };
            const nearestWall = Object.keys(walls).reduce((a, b) => (walls as any)[a] < (walls as any)[b] ? a : b);
            const PUSH_OFFSET = 50;
            if (nearestWall === 'left') tx += PUSH_OFFSET; else if (nearestWall === 'right') tx -= PUSH_OFFSET;
            else if (nearestWall === 'top') ty += PUSH_OFFSET; else if (nearestWall === 'bottom') ty -= PUSH_OFFSET;
        }

        const dx = tx - player.pos.x;
        const dy = ty - player.pos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            thrustDirection.x = dx / len;
            thrustDirection.y = dy / len;
        }

        // 壁回避（updateCpuと同じロジック）
        const avoidanceForce = new Vector2();
        const avoidanceMargin = 50;
        if (player.pos.x < avoidanceMargin) avoidanceForce.x = 1; else if (player.pos.x > this.logicalWidth - avoidanceMargin) avoidanceForce.x = -1;
        if (player.pos.y < avoidanceMargin) avoidanceForce.y = 1; else if (player.pos.y > this.logicalHeight - avoidanceMargin) avoidanceForce.y = -1;
        
        if (avoidanceForce.length() > 0) {
            player.applyForce(avoidanceForce.normalize().scale(2000));
        }

        // ブレーキ値の計算
        let breakingValue = 0;
        if (player.pos.x < WALL_MARGIN || player.pos.x > this.logicalWidth - WALL_MARGIN) {
            breakingValue = (WALL_MARGIN - Math.min(player.pos.x, this.logicalWidth - player.pos.x)) / BREAK_BOOST;
        } else if (player.pos.y < WALL_MARGIN || player.pos.y > this.logicalHeight - WALL_MARGIN) {
            breakingValue = (WALL_MARGIN - Math.min(player.pos.y, this.logicalHeight - player.pos.y)) / BREAK_BOOST;
        }

        if (mode === 'RETURN') {
            // 中央に戻る（ステアリング動作でスムーズかつ迅速に）
            const toTarget = targetPos.subtract(player.pos);
            const dist = toTarget.length();
            
            // 到着挙動（Arrival Behavior）
            // 距離が遠いときは最大速度、近づいたら減速
            const slowDownRadius = 300;
            const maxSpeed = 1200; // 高速に戻る
            let targetSpeed = maxSpeed;
            
            if (dist < slowDownRadius) {
                targetSpeed = maxSpeed * (dist / slowDownRadius);
            }
            
            // 理想的な速度ベクトル
            const desiredVel = toTarget.normalize().scale(targetSpeed);
            
            // ステアリング力 = (理想速度 - 現在速度) * 係数
            // 質量増加時も動きが鈍くならないように thrustMultiplier を考慮（あるいは無視して強制的に動かす）
            // ここでは演出優先でキビキビ動かすために強めの係数を使う
            const steeringForce = desiredVel.subtract(player.vel).scale(15);
            
            player.applyForce(steeringForce);
            
            // 噴射エフェクト
            if (steeringForce.length() > 500 && this.frameCount % 3 === 0) {
                this.spawnExhaust(player, steeringForce.normalize(), 0.6);
            }

        } else if (mode === 'CHASE') {
            // 敵やアイテムを追う
            if (thrustDirection.length() > 0) {
                let fx = thrustDirection.x * this.currentCpuThrust;
                let fy = thrustDirection.y * this.currentCpuThrust;
                
                // 推力倍率を適用（質量増加アイテムなどの効果）
                fx *= player.thrustMultiplier;
                fy *= player.thrustMultiplier;
                
                // ブレーキ適用
                if (player.vel.x * thrustDirection.x < 0) fx *= (BREAKING_CONSTANT + breakingValue);
                if (player.vel.y * thrustDirection.y < 0) fy *= (BREAKING_CONSTANT + breakingValue);
                
                player.applyForce(new Vector2(fx, fy));
                if (Math.random() > 0.4) this.spawnExhaust(player, thrustDirection, 0.8);
            }
        }
    }

    // チュートリアルデモの共通処理
    runTutorialDemo(dt: number, itemType: ItemType | null, message: string, requiredKills: number = 1, enemySpawnPos: Vector2 | null = null): boolean {
        const player = this.entities.find(e => e.isPlayer);
        if (!player) return false;

        // Phase 0: Spawn & Explain
        if (this.tutorialPhase === 0) {
            this.tutorialMessage = message;
            this.tutorialDemoTimer += dt;
            
            // 初期化（初回のみ）
            if (this.tutorialDemoTimer - dt <= 0) {
                this.entities = this.entities.filter(e => e.isPlayer);
                this.items = [];
                this.spawnWarnings = [];
                
                // アイテムスポーン
                if (itemType !== null) {
                    this.items.push(new Item(this.logicalWidth / 1.8, this.logicalHeight / 2.3, itemType));
                }
                
                // 敵スポーン（固定位置またはランダム）
                let ex = this.logicalWidth / 2 + (Math.random() > 0.5 ? 250 : -250);
                let ey = this.logicalHeight / 2 + (Math.random() > 0.5 ? 250 : -250);
                
                if (enemySpawnPos) {
                    ex = enemySpawnPos.x;
                    ey = enemySpawnPos.y;
                }

                this.spawnWarnings.push({ x: ex, y: ey, timer: 1.5, isPlayer: false });
                
                // プレイヤー位置リセット（中央付近へ）
                // 慣性で場外に出ないように速度もリセット
                player.pos = new Vector2(this.logicalWidth/2 - 200, this.logicalHeight/2);
                player.vel = new Vector2(0, 0);
                player.acc = new Vector2(0, 0);
            }

            // 入力無効化
            this.input = { up: false, down: false, left: false, right: false };
            // 念のため速度を強制的にゼロにする（慣性移動防止）
            player.vel = new Vector2(0, 0);

            if (this.tutorialDemoTimer > 2.0) {
                this.tutorialPhase = 1;
                this.tutorialDemoTimer = 0;
            }
        }
        // Phase 1: Item Collection
        else if (this.tutorialPhase === 1) {
            this.input = { up: false, down: false, left: false, right: false };
            
            if (itemType === null || this.items.length === 0) {
                // アイテムなし、または取得済み
                this.tutorialPhase = 2;
                this.tutorialDemoTimer = 0;
            } else {
                // アイテムを取りに行く
                const item = this.items[0];
                if (item) {
                    this.updateTutorialAi(player, item.pos, 'CHASE');
                }
            }
        }
        // Phase 2: Combat Demo
        else if (this.tutorialPhase === 2) {
            this.input = { up: false, down: false, left: false, right: false };
            
            const enemy = this.entities.find(e => e.isCpu);
            if (!enemy && this.spawnWarnings.length === 0) {
                // 敵撃破完了
                this.tutorialPhase = 3;
                this.tutorialDemoTimer = 0;
            } else if (enemy) {
                // 戦闘AI
                this.updateTutorialAi(player, enemy, 'CHASE');
            }
        }
        // Phase 3: Return to Center
        else if (this.tutorialPhase === 3) {
            this.input = { up: false, down: false, left: false, right: false };
            
            const center = new Vector2(this.logicalWidth / 2, this.logicalHeight / 2);
            this.updateTutorialAi(player, center, 'RETURN');
            
            const dist = Vector2.distance(player.pos, center);
            if (dist < 100 && player.vel.length() < 300) {
                this.tutorialPhase = 4;
                this.tutorialDemoTimer = 0;
                player.vel = new Vector2(0, 0); // 強制停止
            }
        }
        // Phase 4: Transition
        else if (this.tutorialPhase === 4) {
            this.input = { up: false, down: false, left: false, right: false };
            this.tutorialDemoTimer += dt;
            
            if (this.tutorialDemoTimer - dt <= 0) {
                // 演出開始
                this.triggerVictoryBurst(); // 派手な演出を流用
                this.tutorialMessage = "YOUR TURN!";
                this.shakeIntensity = 20;

                // プレイヤー中心のバーストエフェクト
                for (let i = 0; i < 50; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 200 + Math.random() * 300;
                    const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
                    this.particles.push(new Particle(player.pos.x, player.pos.y, vel, COLOR_PLAYER, 1.5));
                }
                // 衝撃波リング
                this.visualWaves.push(new VisualWave(player.pos.x, player.pos.y, COLOR_PLAYER));
            }
            
            if (this.tutorialDemoTimer > 1.5) {
                this.tutorialPhase = 5;
                this.tutorialDemoTimer = 0;
                this.killCount = 0; // カウンターリセット
                
                // プレイヤー実践用の敵スポーン
                this.requestSpawnEnemy();

                // プレイヤー実践用のアイテムスポーン
                if (itemType !== null) {
                    this.items.push(new Item(this.logicalWidth / 2, this.logicalHeight / 2, itemType));
                }
            }
        }
        // Phase 5: Player Practice
        else if (this.tutorialPhase === 5) {
            this.tutorialMessage = `実践: 敵を撃破せよ (${this.killCount}/${requiredKills})`;
            
            // アイテム再出現チェック（効果切れかつアイテムがない場合）
            if (itemType !== null) {
                const itemExists = this.items.some(i => i.type === itemType);
                let effectActive = false;
                
                switch (itemType) {
                    case ItemType.MASS_BOOST:
                        effectActive = player.massMultiplier > 1.0;
                        break;
                    case ItemType.SATELLITE:
                        effectActive = this.entities.some(e => e.isSatellite && e.owner === player);
                        break;
                    case ItemType.GRAVITY_WAVE:
                        effectActive = player.waveChargeCount > 0;
                        break;
                    case ItemType.INVERSION:
                        effectActive = player.isInversionActive();
                        break;
                }
                
                if (!itemExists && !effectActive) {
                     this.items.push(new Item(this.logicalWidth / 2, this.logicalHeight / 2, itemType));
                     // 出現エフェクト
                     for(let i=0; i<10; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 50 + Math.random() * 100;
                        const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
                        this.particles.push(new Particle(this.logicalWidth / 2, this.logicalHeight / 2, vel, COLOR_PARTICLE, 1.0));
                    }
                }
            }

            // 敵がいなくなったら補充
            if (this.killCount < requiredKills) {
                const enemies = this.entities.filter(e => e.isCpu);
                if (enemies.length === 0 && this.spawnWarnings.length === 0) {
                    this.requestSpawnEnemy();
                }
            } else {
                // ノルマ達成
                return true;
            }
        }
        
        return false;
    }

    // チュートリアルシナリオの進行
    updateTutorial(dt: number) {
        const player = this.entities.find(e => e.isPlayer);
        
        // ステップ0: 初期化と操作説明
        if (this.tutorialStep === 0) {
            this.tutorial_step_show = "STEP 1/6";
            this.tutorialMessage = `操作確認: 指定エリアへ移動 (${this.tutorialMoveCount + 1}/5)`;
            
            // ジョイスティックをハイライト

            if (player && this.tutorialTarget) {
                const dist = Math.sqrt(Math.pow(player.pos.x - this.tutorialTarget.x, 2) + Math.pow(player.pos.y - this.tutorialTarget.y, 2));
                const targetRadius = 100;

                // ターゲットに到達
                if (dist < targetRadius) {
                    this.tutorialMoveCount++;
                    
                    // 到達エフェクト
                    for(let i=0; i<20; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 100 + Math.random() * 200;
                        const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
                        this.particles.push(new Particle(this.tutorialTarget.x, this.tutorialTarget.y, vel, COLOR_ITEM_CAPTURE, 1.0));
                    }

                    if (this.tutorialMoveCount >= 5) {
                        // 完了
                        this.tutorialStep = 1;
                        this.tutorialTimer = 0;
                        this.tutorialTarget = null;
                        this.tutorialMoveCount = 0;
                        this.tutorialPhase = 0; // Reset phase for next step
                        this.tutorialDemoTimer = 0;
                    } else {
                        // 次のターゲット設定
                        if (this.tutorialMoveCount === 1) {
                            this.tutorialTarget = new Vector2(this.logicalWidth * 0.2, this.logicalHeight * 0.5);
                        } else if (this.tutorialMoveCount === 2) {
                            this.tutorialTarget = new Vector2(this.logicalWidth * 0.5, this.logicalHeight * 0.2);
                        } else if (this.tutorialMoveCount === 3) {
                            this.tutorialTarget = new Vector2(this.logicalWidth * 0.8, this.logicalHeight * 0.8);
                        } else if (this.tutorialMoveCount === 4) {
                            this.tutorialTarget = new Vector2(this.logicalWidth * 0.2, this.logicalHeight * 0.2);
                        } 
                    }
                }
            }
        }
        // ステップ1: 敵の撃墜（重力の説明）
        else if (this.tutorialStep === 1) {
            this.tutorial_step_show = "STEP 2/6";
            // 中央右側
            const spawnPos = new Vector2(this.logicalWidth * 0.7, this.logicalHeight * 0.6);
            if (this.runTutorialDemo(dt, null, "DEMO: 敵が出現！重力で引き寄せ、場外へ弾き出せ！", 2, spawnPos)) {
                this.tutorialStep = 2;
                this.tutorialPhase = 0;
                this.tutorialDemoTimer = 0;
            }
        }
        // ステップ2: 質量増加
        else if (this.tutorialStep === 2) {
            this.tutorial_step_show = "STEP 3/6";
            // 左下
            const spawnPos = new Vector2(this.logicalWidth * 0.2, this.logicalHeight * 0.7);
            if (this.runTutorialDemo(dt, ItemType.MASS_BOOST, "DEMO: 【質量増加(黄)】重力が超絶強化！敵を吸い寄せろ！", 1, spawnPos)) {
                this.tutorialStep = 3;
                this.tutorialPhase = 0;
                this.tutorialDemoTimer = 0;
            }
        }
        // ステップ3: 衛星
        else if (this.tutorialStep === 3) {
            this.tutorial_step_show = "STEP 4/6";
            // 右上
            const spawnPos = new Vector2(this.logicalWidth * 0.7, this.logicalHeight * 0.2);
            if (this.runTutorialDemo(dt, ItemType.SATELLITE, "DEMO: 【衛星(銀)】多数の衛星が敵に突撃！", 1, spawnPos)) {
                this.tutorialStep = 4;
                this.tutorialPhase = 0;
                this.tutorialDemoTimer = 0;
            }
        }
        // ステップ4: 重力波
        else if (this.tutorialStep === 4) {
            this.tutorial_step_show = "STEP 5/6";
            // 中央上
            const spawnPos = new Vector2(this.logicalWidth * 0.5, this.logicalHeight * 0.4);
            if (this.runTutorialDemo(dt, ItemType.GRAVITY_WAVE, "DEMO: 【重力波(紫)】重力波で敵を吹き飛ばせ！", 1, spawnPos)) {
                this.tutorialStep = 5;
                this.tutorialPhase = 0;
                this.tutorialDemoTimer = 0;
            }
        }
        // ステップ5: 反転
        else if (this.tutorialStep === 5) {
            this.tutorial_step_show = "STEP 6/6";
            // プレイヤーに向かってくる位置（中央から見て右下）
            const spawnPos = new Vector2(this.logicalWidth * 0.6, this.logicalHeight * 0.8);
            if (this.runTutorialDemo(dt, ItemType.INVERSION, "DEMO: 【反転(緑)】重力が斥力に変化！敵を押し出せ！", 1, spawnPos)) {
                this.tutorialStep = 6;
                this.tutorialPhase = 0;
                this.tutorialDemoTimer = 0;
            }
        }
        // ステップ6: 完了
        else if (this.tutorialStep === 6) {
            this.tutorial_step_show = "COMPLETE";
            this.tutorialMessage = "TUTORIAL COMPLETE!";
            this.tutorialTimer += dt;
            if (this.tutorialTimer > 3.0) {
                this.setGameState(GameState.VICTORY);
            }
        }
    }

    // 統計情報の送信
    emitStats(currentGravityForce: number = 0) {
        if (!this.onStatsUpdate) return;
        const player = this.entities.find(e => e.isPlayer);
        
        // チュートリアル固有のフラグ設定
        let highlightJoystick = false;
        if (this.gameMode === GameMode.TUTORIAL && this.tutorialStep === 0) {
            highlightJoystick = true;
        }

        // プレイヤーがいなくても最後の記録を送信する
        this.onStatsUpdate({ 
             mode: this.gameMode, 
             difficulty: this.currentDifficulty,
             speed: player ? player.vel.length() : 0, 
             gravityForce: currentGravityForce,
             maxSpeed: this.maxSpeedRecorded, 
             maxGravity: this.maxGravityRecorded, 
             currentEnemies: this.entities.filter(e => e.isCpu).length, 
             initialEnemies: this.initialEnemyCount, 
             timeSurvived: Math.max(0, this.survivalTime), // 累積時間を使用
             dangerLevel: 0, 
             kills: this.killCount,
             tutorialMessage: this.gameMode === GameMode.TUTORIAL ? this.tutorialMessage : undefined,
             tutorial_step_show: this.gameMode === GameMode.TUTORIAL ? this.tutorial_step_show : undefined,
             highlightJoystick: highlightJoystick
        });
    }

    // メイン更新ループ：物理演算、衝突判定など
    update(dt: number) {
        // 画面揺れ・フラッシュの減衰
        if (this.shakeIntensity > 0.1) this.shakeIntensity *= this.shakeDecay; else this.shakeIntensity = 0;
        if (this.flashOpacity > 0.01) this.flashOpacity *= 0.9; else this.flashOpacity = 0;
        
        // パーティクル更新
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0) { this.particles[i] = this.particles[this.particles.length - 1]; this.particles.pop(); }
        }
        
        // 出現警告タイマー更新 -> エンティティ実体化
        for (let i = this.spawnWarnings.length - 1; i >= 0; i--) {
            this.spawnWarnings[i].timer -= dt;
            if (this.spawnWarnings[i].timer <= 0) { 
                const w = this.spawnWarnings[i]; 
                
                // 出現確定時に座標をクランプして画面外即死を防ぐ
                // この時点で resize() が完了しているため this.logicalWidth/Height は最新の値
                const margin = 40; // 壁際過ぎると判定に引っかかる可能性があるためマージンを取る
                const safeX = Math.max(margin, Math.min(w.x, this.logicalWidth - margin));
                const safeY = Math.max(margin, Math.min(w.y, this.logicalHeight - margin));

                this.entities.push(new Entity(safeX, safeY, !!w.isPlayer)); 
                this.spawnWarnings.splice(i, 1); 
            }
        }

        // アイテム更新と取得判定
        for (let i = this.items.length - 1; i >= 0; i--) this.items[i].update(dt);
        for (let i = this.gravityWaves.length - 1; i >= 0; i--) {
            this.gravityWaves[i].update(dt, this.entities);
            if (this.gravityWaves[i].life <= 0) this.gravityWaves.splice(i, 1);
        }
        for (let i = this.visualWaves.length - 1; i >= 0; i--) {
            this.visualWaves[i].update(dt);
            if (this.visualWaves[i].life <= 0) this.visualWaves.splice(i, 1);
        }
        
        // PAUSE時はここで物理演算停止
        if (this.gameState === GameState.PAUSED) {
            return;
        }
        if (this.gameState !== GameState.PLAYING) return;
        
        // 時間経過の加算（PAUSEでない場合のみ）
        this.survivalTime += dt;

        // チュートリアル更新
        if (this.gameMode === GameMode.TUTORIAL) {
            this.updateTutorial(dt);
        }

        // アイテムスポーン管理
        this.itemSpawnTimer -= dt;
        if (this.gameMode !== GameMode.TUTORIAL && this.itemSpawnTimer <= 0) {
            const x = Math.random() * (this.logicalWidth - 100) + 50; const y = Math.random() * (this.logicalHeight - 100) + 50;
            const r = Math.random();
            let type = ItemType.MASS_BOOST;
            let sum_ratio = item_ratio.reduce((acc, val) => acc+val, 0)
            if (r < item_ratio[0]/sum_ratio) type = ItemType.MASS_BOOST;
            else if (r < (item_ratio[0]+item_ratio[1])/sum_ratio) type = ItemType.SATELLITE;
            else if (r < (item_ratio[0]+item_ratio[1]+item_ratio[2])/sum_ratio) type = ItemType.INVISIBILITY;
            else if (r < (item_ratio[0]+item_ratio[1]+item_ratio[2]+item_ratio[3])/sum_ratio) type = ItemType.GRAVITY_WAVE;
            else if (r < (item_ratio[0]+item_ratio[1]+item_ratio[2]+item_ratio[3]+item_ratio[4])/sum_ratio) type = ItemType.INVERSION;
            else if (r < (item_ratio[0]+item_ratio[1]+item_ratio[2]+item_ratio[3]+item_ratio[4]+item_ratio[5])/sum_ratio) type = ItemType.REPULSIVE_TRAIL;
            else if (r < (item_ratio[0]+item_ratio[1]+item_ratio[2]+item_ratio[3]+item_ratio[4]+item_ratio[5]+item_ratio[6])/sum_ratio) type = ItemType.CAPTURE;
            else type = ItemType.RAMJET;

            this.items.push(new Item(x, y, type));
            this.itemSpawnTimer = ITEM_SPAWN_INTERVAL_MIN + Math.random() * (ITEM_SPAWN_INTERVAL_MAX - ITEM_SPAWN_INTERVAL_MIN);
        }
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i]; let itemConsumed = false;
            for (const entity of this.entities) {
                if (entity.isSatellite) continue;
                const dx = entity.pos.x - item.pos.x; const dy = entity.pos.y - item.pos.y; const distSq = dx * dx + dy * dy;
                if (distSq < Math.pow(entity.radius + ITEM_AREA_RADIUS, 2)) {
                    if (item.type === ItemType.MASS_BOOST) {
                        entity.powerupTimer = POWERUP_DURATION; entity.massMultiplier = MASS_BOOST_MULTIPLIER; entity.thrustMultiplier = MASS_BOOST_MULTIPLIER;
                    } else if (item.type === ItemType.SATELLITE) {
                        for (let s = 0; s < SATELLITE_NUM; s++) {
                            const sat = new Entity(entity.pos.x, entity.pos.y, false, true, entity);
                            const launchAngle = Math.PI * 2 *Math.random();
                            sat.vel = new Vector2(Math.cos(launchAngle), Math.sin(launchAngle)).scale(100).add(entity.vel);
                            this.entities.push(sat);
                        }
                    } else if (item.type === ItemType.INVISIBILITY) { entity.stealthTimer = STEALTH_TOTAL_DURATION; }
                    else if (item.type === ItemType.GRAVITY_WAVE) { entity.waveChargeCount = 2; entity.waveChargeTimer = WAVE_WAITING; }
                    else if (item.type === ItemType.INVERSION) { entity.inversionTimer = INVERSION_DURATION; }
                    else if (item.type === ItemType.REPULSIVE_TRAIL) { 
                        entity.repulsiveTrailTimer = REPULSIVE_TRAIL_DURATION; 
                        entity.trail = []; // Reset trail immediately to remove previous trail visuals
                    } else if (item.type === ItemType.CAPTURE) {
                        entity.captureTimer = CAPTURE_DURATION;
                    } else if (item.type === ItemType.RAMJET) {
                        entity.ramjetTimer = RAMJET_DURATION;
                    }

                    this.flashOpacity = entity.isPlayer ? 0.4 : 0.2;
                    let fColor = COLOR_ITEM_MASS;
                    if (item.type === ItemType.SATELLITE) fColor = COLOR_ITEM_SATELLITE;
                    else if (item.type === ItemType.INVISIBILITY) fColor = COLOR_ITEM_STEALTH;
                    else if (item.type === ItemType.GRAVITY_WAVE) fColor = COLOR_ITEM_WAVE;
                    else if (item.type === ItemType.INVERSION) fColor = COLOR_ITEM_INVERSION;
                    else if (item.type === ItemType.REPULSIVE_TRAIL) fColor = COLOR_ITEM_REPULSIVE;
                    else if (item.type === ItemType.CAPTURE) fColor = COLOR_ITEM_CAPTURE;
                    else if (item.type === ItemType.RAMJET) fColor = COLOR_ITEM_RAMJET_FRONT;
                    
                    this.flashColor = fColor; itemConsumed = true;
                    for (let p = 0; p < 30; p++) {
                        const angle = Math.random() * Math.PI * 2; const speed = 100 + Math.random() * 200;
                        const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
                        this.particles.push(new Particle(item.pos.x, item.pos.y, vel, this.flashColor, 1.5));
                    }
                    break;
                }
            }
            if (itemConsumed) this.items.splice(i, 1);
        }
        
        // 強奪（Capture）ロジック：範囲内の敵からバフを吸い取る
        for (const capturer of this.entities) {
            if (capturer.captureTimer <= 0) {
                if (capturer.captureProgress.size > 0) capturer.captureProgress.clear();
                continue;
            }

            const activeTargetsInFrame = new Set<Entity>();

            for (const victim of this.entities) {
                if (capturer === victim || victim.isSatellite) continue; 
                if (victim.owner === capturer || capturer.owner === victim) continue;

                // Check distance
                const dx = capturer.pos.x - victim.pos.x;
                const dy = capturer.pos.y - victim.pos.y;
                const distSq = dx*dx + dy*dy;
                
                if (distSq < CAPTURE_RADIUS * CAPTURE_RADIUS) {
                    // 奪える候補をリストアップ
                    const stealableItems: { type: string, time: number, color: string }[] = [];
                    
                    if (victim.powerupTimer > 0) stealableItems.push({ type: 'MASS', time: CAPTURE_TIME_MASS, color: COLOR_ITEM_MASS });
                    if (victim.stealthTimer > 0) stealableItems.push({ type: 'STEALTH', time: CAPTURE_TIME_STEALTH, color: COLOR_ITEM_STEALTH });
                    if (victim.inversionTimer > 0) stealableItems.push({ type: 'INVERSION', time: CAPTURE_TIME_INVERSION, color: COLOR_ITEM_INVERSION });
                    if (victim.repulsiveTrailTimer > 0) stealableItems.push({ type: 'TRAIL', time: CAPTURE_TIME_TRAIL, color: COLOR_ITEM_REPULSIVE });
                    if (victim.waveChargeCount > 0) stealableItems.push({ type: 'WAVE', time: CAPTURE_TIME_WAVE, color: COLOR_ITEM_WAVE });
                    if (victim.ramjetTimer > 0) stealableItems.push({ type: 'RAMJET', time: CAPTURE_TIME_RAMJET, color: COLOR_ITEM_RAMJET_FRONT });

                    if (stealableItems.length > 0) {
                        // 必要な時間が短い順にソート（奪いやすい順）
                        stealableItems.sort((a, b) => a.time - b.time);

                        activeTargetsInFrame.add(victim);
                        const currentProgress = capturer.captureProgress.get(victim) || 0;
                        const nextProgress = currentProgress + dt;
                        capturer.captureProgress.set(victim, nextProgress);

                        // Particle Effect (Suction)
                        // 量を増やす: 1フレームに2個生成して密度を上げる
                        for (let i = 0; i < 5; i++) {
                             // ランダムに選ばれた色のパーティクルを出す（視覚的には全て吸っているように）
                             const targetItem = stealableItems[Math.floor(Math.random() * stealableItems.length)];
                             this.spawnCaptureStreamParticle(victim, capturer, targetItem.color);
                        }

                        // 最も奪いやすいアイテムの条件を満たしたか？
                        const targetToSteal = stealableItems[0];

                        if (nextProgress >= targetToSteal.time) {
                            let stoleSomething = false;

                            switch (targetToSteal.type) {
                                case 'MASS':
                                    if (victim.powerupTimer > 0) {
                                        capturer.powerupTimer = Math.max(capturer.powerupTimer, victim.powerupTimer);
                                        capturer.massMultiplier = MASS_BOOST_MULTIPLIER;
                                        capturer.thrustMultiplier = MASS_BOOST_MULTIPLIER;
                                        victim.powerupTimer = 0;
                                        victim.massMultiplier = 1.0;
                                        victim.thrustMultiplier = 1.0;
                                        this.spawnTransferParticles(victim, capturer, COLOR_ITEM_MASS);
                                        this.visualWaves.push(new VisualWave(capturer.pos.x, capturer.pos.y, COLOR_ITEM_MASS));
                                        stoleSomething = true;
                                    }
                                    break;
                                case 'STEALTH':
                                    if (victim.stealthTimer > 0) {
                                        capturer.stealthTimer = Math.max(capturer.stealthTimer, victim.stealthTimer);
                                        victim.stealthTimer = 0;
                                        victim.stealthOpacity = 1.0;
                                        this.spawnTransferParticles(victim, capturer, COLOR_ITEM_STEALTH);
                                        this.visualWaves.push(new VisualWave(capturer.pos.x, capturer.pos.y, COLOR_ITEM_STEALTH));
                                        stoleSomething = true;
                                    }
                                    break;
                                case 'INVERSION':
                                    if (victim.inversionTimer > 0) {
                                        capturer.inversionTimer = Math.max(capturer.inversionTimer, victim.inversionTimer);
                                        victim.inversionTimer = 0;
                                        this.spawnTransferParticles(victim, capturer, COLOR_ITEM_INVERSION);
                                        this.visualWaves.push(new VisualWave(capturer.pos.x, capturer.pos.y, COLOR_ITEM_INVERSION));
                                        stoleSomething = true;
                                    }
                                    break;
                                case 'TRAIL':
                                    if (victim.repulsiveTrailTimer > 0) {
                                        capturer.repulsiveTrailTimer = Math.max(capturer.repulsiveTrailTimer, victim.repulsiveTrailTimer);
                                        capturer.trail = []; 
                                        
                                        victim.repulsiveTrailTimer = 0;
                                        victim.trail.forEach(p => p.isRepulsive = false); 
                                        this.spawnTransferParticles(victim, capturer, COLOR_ITEM_REPULSIVE);
                                        this.visualWaves.push(new VisualWave(capturer.pos.x, capturer.pos.y, COLOR_ITEM_REPULSIVE));
                                        stoleSomething = true;
                                    }
                                    break;
                                case 'WAVE':
                                    if (victim.waveChargeCount > 0) {
                                        capturer.waveChargeCount += victim.waveChargeCount;
                                        capturer.waveChargeTimer = WAVE_WAITING; 
                                        victim.waveChargeCount = 0;
                                        this.spawnTransferParticles(victim, capturer, COLOR_ITEM_WAVE);
                                        this.visualWaves.push(new VisualWave(capturer.pos.x, capturer.pos.y, COLOR_ITEM_WAVE));
                                        stoleSomething = true;
                                    }
                                    break;
                                case 'RAMJET':
                                    if (victim.ramjetTimer > 0) {
                                        capturer.ramjetTimer = Math.max(capturer.ramjetTimer, victim.ramjetTimer);
                                        victim.ramjetTimer = 0;
                                        this.spawnTransferParticles(victim, capturer, COLOR_ITEM_RAMJET_FRONT);
                                        this.visualWaves.push(new VisualWave(capturer.pos.x, capturer.pos.y, COLOR_ITEM_RAMJET_FRONT));
                                        stoleSomething = true;
                                    }
                                    break;
                            }
                            
                            if (stoleSomething) {
                                capturer.captureProgress.set(victim, 0); 
                            }
                        }
                    }
                }
            }

            // Cleanup entities no longer in range
            for (const key of capturer.captureProgress.keys()) {
                if (!activeTargetsInFrame.has(key)) {
                    capturer.captureProgress.delete(key);
                }
            }
        }
        
        // プレイヤーの入力処理と物理力適用
        const player = this.entities.find(e => e.isPlayer);
        let playerTotalGravityForce = 0, minDangerDist = Infinity;
        if (player) {
            let tx = 0, ty = 0, magnitude = 0;
            if (this.input.vector && (Math.abs(this.input.vector.x) > 0.01 || Math.abs(this.input.vector.y) > 0.01)) {
                tx = this.input.vector.x; ty = this.input.vector.y; magnitude = Math.sqrt(tx * tx + ty * ty);
            } else {
                if (this.input.left) tx -= 1; if (this.input.right) tx += 1; if (this.input.up) ty -= 1; if (this.input.down) ty += 1;
                magnitude = (tx !== 0 || ty !== 0) ? 1.0 : 0;
            }
            if (player.pos.x < WALL_MARGIN || player.pos.x > this.logicalWidth - WALL_MARGIN) {
                const dist = Math.min(player.pos.x, this.logicalWidth - player.pos.x);
                player.breakingValue = (WALL_MARGIN - dist) / BREAK_BOOST; minDangerDist = Math.min(minDangerDist, dist);
            } else if (player.pos.y < WALL_MARGIN || player.pos.y > this.logicalHeight - WALL_MARGIN) {
                const dist = Math.min(player.pos.y, this.logicalHeight - player.pos.y);
                player.breakingValue = (WALL_MARGIN - dist) / BREAK_BOOST; minDangerDist = Math.min(minDangerDist, dist);
            } else { player.breakingValue = 0; minDangerDist = Math.min(player.pos.x, this.logicalWidth - player.pos.x, player.pos.y, this.logicalHeight - player.pos.y); }
            if (magnitude > 0) {
                const len = Math.sqrt(tx * tx + ty * ty); const nx = tx / len; const ny = ty / len;
                let fx = nx * THRUST_FORCE * Math.min(magnitude, 1.0) * player.thrustMultiplier; 
                let fy = ny * THRUST_FORCE * Math.min(magnitude, 1.0) * player.thrustMultiplier;
                if (player.vel.x * nx < 0) fx *= (BREAKING_CONSTANT + player.breakingValue);
                if (player.vel.y * ny < 0) fy *= (BREAKING_CONSTANT + player.breakingValue);
                player.applyForce(new Vector2(fx, fy));
                for(let i = 0; i < Math.floor(Math.min(magnitude, 1) * 3); i++) this.spawnExhaust(player, new Vector2(nx, ny), magnitude);
            }
        }
        
        // エンティティの更新（AI等）
        this.entities.forEach(e => { 
            if (e.isCpu) this.updateCpu(e); if (e.isSatellite) this.updateSatellite(e);
            // 重力波チャージ処理
            if (e.waveChargeCount > 0) {
                e.waveChargeTimer -= dt;
                if (e.waveChargeTimer <= 0) {
                    this.gravityWaves.push(new GravityWave(e.pos.x, e.pos.y, e)); 
                    e.waveChargeCount--; e.waveChargeTimer = WAVE_INTERVAL;
                }
            }
        });
        
        // 斥力トレイル（Repulsive Trail）の衝突判定
        // 線分と円の衝突判定を行い、反射ベクトルを計算
        for (const entity of this.entities) {
            if (entity.isStealthActive()) continue; // Stealth check for repulsive trail

            for (const other of this.entities) {
                if (entity === other) continue;
                if (other.trail.length < 2) continue;
                
                // Entity is the "ball", Other is the "wall provider"
                // Don't collide with own trail or owner's trail? (Requirement says "user is not affected")
                if (other === entity || (entity.owner && entity.owner === other)) continue;
                
                // Iterate trail segments
                for (let i = 0; i < other.trail.length - 1; i++) {
                    const p1 = other.trail[i];
                    const p2 = other.trail[i+1];
                    if (!p1.isRepulsive) continue;

                    // Line segment collision with circle
                    // Closest point on segment
                    const l2 = (p1.x - p2.x)**2 + (p1.y - p2.y)**2;
                    if (l2 === 0) continue;
                    
                    let t = ((entity.pos.x - p1.x) * (p2.x - p1.x) + (entity.pos.y - p1.y) * (p2.y - p1.y)) / l2;
                    t = Math.max(0, Math.min(1, t));
                    
                    const closestX = p1.x + t * (p2.x - p1.x);
                    const closestY = p1.y + t * (p2.y - p1.y);
                    
                    const distSq = (entity.pos.x - closestX)**2 + (entity.pos.y - closestY)**2;
                    const minDist = entity.radius + (TRAIL_WIDTH * 1.5); // Approximate radius of trail
                    
                    if (distSq < minDist * minDist) {
                        // Collision response
                        const segDx = p2.x - p1.x;
                        const segDy = p2.y - p1.y;
                        const segLen = Math.sqrt(l2);

                        // 平面法線ベースの衝突処理
                        // 線分に対して常に垂直な法線を使用し、端点での逆反射を防ぐ
                        let nx = -segDy / segLen;
                        let ny = segDx / segLen;

                        // エンティティがいる側に向ける
                        const toEntityX = entity.pos.x - closestX;
                        const toEntityY = entity.pos.y - closestY;
                        
                        // 内積で向き確認
                        if (nx * toEntityX + ny * toEntityY < 0) {
                            nx = -nx;
                            ny = -ny;
                        }
                        
                        const nLen = Math.sqrt(distSq);

                        // Velocity Reflection
                        const dot = entity.vel.x * nx + entity.vel.y * ny;
                        if (dot < 0) { // Only reflect if moving towards
                            const restitution = entity.isInversionActive() ? 0 : REPULSIVE_TRAIL_RESTITUTION;
                            
                            // Decompose velocity
                            const vnX = nx * dot;
                            const vnY = ny * dot;
                            const vtX = entity.vel.x - vnX;
                            const vtY = entity.vel.y - vnY;

                            // Apply restitution/friction
                            // Normal: Reflects (negative) and scales by restitution
                            // Tangential: Scales by REPULSIVE_TRAIL_RESTITUTION_TAN
                            entity.vel.x = ((vnX) * -restitution) + (vtX * REPULSIVE_TRAIL_RESTITUTION_TAN);
                            entity.vel.y = ((vnY) * -restitution) + (vtY * REPULSIVE_TRAIL_RESTITUTION_TAN);
                            
                            // Push out to prevent sticking
                            // Use normal direction, but distance is calculated from closest point
                            // If exactly on line (nLen=0), push out by radius
                            const pushDist = (minDist - nLen) + 1.0;
                            entity.pos.x += nx * pushDist;
                            entity.pos.y += ny * pushDist;
                            
                            // Effect
                            if (Math.random() > 0.5) {
                                for(let k=0; k<5; k++) {
                                    this.particles.push(new Particle(closestX, closestY, new Vector2(nx*100 + (Math.random()-0.5)*100, ny*100 + (Math.random()-0.5)*100), COLOR_ITEM_REPULSIVE));
                                }
                            }
                            
                            // Important: Break loop to prevent double collision handling for the same trail
                            break;
                        }
                    }
                }
            }
        }

        // 万有引力（重力）計算：全対全の相互作用 O(N^2)
        for (let i = 0; i < this.entities.length; i++) {
            for (let j = i + 1; j < this.entities.length; j++) {
                const A = this.entities[i], B = this.entities[j];
                if (A.owner === B || B.owner === A) continue;
                if (A.isSatellite && B.isSatellite) continue;
                const dx = B.pos.x - A.pos.x; const dy = B.pos.y - A.pos.y; const distSq = dx * dx + dy * dy;
                if (distSq > 0) {
                    // 難易度に基づいた重力定数を使用
                    const forceMag = Math.min(this.currentGravityConstant * (A.getCurrentMass() * B.getCurrentMass()) / (distSq ** DIST_EXP) , GRAVITY_MAX);
                    const dist = Math.sqrt(distSq); const fx = (dx / dist) * forceMag; const fy = (dy / dist) * forceMag;
                    let fOnA = new Vector2(fx, fy); let fOnB = new Vector2(-fx, -fy);
                    const aInv = A.isInversionActive(); const bInv = B.isInversionActive();
                    if (aInv || bInv) {
                        fOnA = fOnA.scale(-1); fOnB = fOnB.scale(-1); // Reverse to repulsion
                        let multA = 1.0; let multB = 1.0;
                        if (aInv) { multA *= INVERSION_MULTIPLE_2; multB *= INVERSION_MULTIPLE_1; }
                        if (bInv) { multB *= INVERSION_MULTIPLE_2; multA *= INVERSION_MULTIPLE_1; }
                        fOnA = fOnA.scale(multA); fOnB = fOnB.scale(multB);
                    }
                    if (A.isStealthActive()) fOnA = fOnA.scale(GRAVITY_REDUCTION);
                    if (B.isStealthActive()) fOnB = fOnB.scale(GRAVITY_REDUCTION);
                    
                    // ラムジェットの倍率適用
                    if (B.isRamjetActive()) {
                        const V_B = B.vel.normalize();
                        const D_A = A.pos.subtract(B.pos).normalize();
                        const dot_B = V_B.dot(D_A);
                        const gain_B = dot_B > 0 ? RAMJET_FRONT_GAIN : RAMJET_REAR_GAIN;
                        fOnA = fOnA.scale(gain_B);
                        
                        // 敵を吸い込んでいる（後ろに引っ張っている）時のみフラッシュ
                        if (gain_B < 0 && dist < 30) {
                            B.ramjetFlash = 1.0;
                        }
                    }
                    if (A.isRamjetActive()) {
                        const V_A = A.vel.normalize();
                        const D_B = B.pos.subtract(A.pos).normalize();
                        const dot_A = V_A.dot(D_B);
                        const gain_A = dot_A > 0 ? RAMJET_FRONT_GAIN : RAMJET_REAR_GAIN;
                        fOnB = fOnB.scale(gain_A);
                        
                        // 敵を吸い込んでいる（後ろに引っ張っている）時のみフラッシュ
                        if (gain_A < 0 && dist < 30) {
                            A.ramjetFlash = 1.0;
                        }
                    }

                    A.applyForce(fOnA); B.applyForce(fOnB);
                    if (A.isPlayer || B.isPlayer) { 
                        playerTotalGravityForce += A.isPlayer ? fOnA.length() : fOnB.length();
                        minDangerDist = Math.min(minDangerDist, dist - A.radius - B.radius); 
                    }
                }
            }
        }
        
        // ラムジェットの爆発フラッシュ制御
        // エンティティの位置更新
        this.entities.forEach(e => e.update(dt));
        
        // 画面外判定（脱落処理）
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const e = this.entities[i];
            if (e.pos.x < 0 || e.pos.x > this.logicalWidth || e.pos.y < 0 || e.pos.y > this.logicalHeight) {
                this.triggerEliminationEffect(e);
                if (e.isPlayer) {
                    // プレイヤー死亡
                    if (this.gameMode === GameMode.TUTORIAL) {
                        // チュートリアルなら復活
                        this.spawnWarnings.push({ x: this.logicalWidth / 2, y: this.logicalHeight / 2, timer: 1.0, isPlayer: true });
                    } else {
                        // ここで統計を更新してからゲームオーバーにする
                        this.emitStats(); 
                        this.setGameState(GameState.GAME_OVER);
                    }
                } else { 
                    // 敵死亡
                    if (!e.isSatellite) this.killCount++; 
                    if (this.gameMode === GameMode.ENDLESS && !e.isSatellite) this.requestSpawnEnemy(); 
                }
                this.entities.splice(i, 1);
            }
        }
        
        // 勝利判定
        if (player) {
            if (player.vel.length() > this.maxSpeedRecorded) this.maxSpeedRecorded = player.vel.length();
            if (playerTotalGravityForce > this.maxGravityRecorded) this.maxGravityRecorded = playerTotalGravityForce;
        }
        const enemiesLeft = this.entities.filter(e => e.isCpu).length;
        if (this.gameMode === GameMode.SURVIVAL && player && enemiesLeft === 0 && this.gameState === GameState.PLAYING && this.spawnWarnings.length === 0) {
            this.emitStats(playerTotalGravityForce);
            this.setGameState(GameState.VICTORY);
        }
        this.frameCount++;
        if (this.onStatsUpdate && this.frameCount % 5 === 0) {
             this.emitStats(playerTotalGravityForce);
        }
    }

    // 敵のリスポーンリクエスト（エンドレスモード用）
    requestSpawnEnemy() {
        // プレイヤーから安全な距離にスポーン位置を探す
        let x = 0, y = 0, attempts = 0, valid = false; const player = this.entities.find(e => e.isPlayer);
        const SPAWN_PADDING = 50; // 安全マージン
        while (!valid && attempts < 20) {
            x = Math.random() * (this.logicalWidth - SPAWN_PADDING * 2) + SPAWN_PADDING; 
            y = Math.random() * (this.logicalHeight - SPAWN_PADDING * 2) + SPAWN_PADDING;
            if (player) { if (Math.pow(x - player.pos.x, 2) + Math.pow(y - player.pos.y, 2) > Math.pow(SAFE_DISTANCE * 2, 2)) valid = true; } else valid = true;
            attempts++;
        }
        this.spawnWarnings.push({ x, y, timer: 2.0, isPlayer: false });
    }

    // 描画処理
    draw() {
        if (!this.width || !this.height) return;
        // 画面クリア
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = '#050505'; this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 座標変換（論理座標系へのスケール、画面揺れ適用）
        this.ctx.save();
        if (this.shakeIntensity > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }
        this.ctx.scale(this.scaleFactor, this.scaleFactor);
        
        // 各要素の描画
        this.drawGrid(); 
        this.drawBoundaries(); 
        this.drawGravityLines(this.ctx, this.scaleFactor); 
        this.drawSpawnWarnings();
        this.drawTutorialTarget();
        // アイテム、波、パーティクル、エンティティ
        this.items.forEach(item => item.draw(this.ctx, this.scaleFactor));
        this.gravityWaves.forEach(wave => wave.draw(this.ctx, this.scaleFactor));
        this.visualWaves.forEach(wave => wave.draw(this.ctx, this.scaleFactor));
        this.ctx.globalCompositeOperation = 'lighter';
        this.particles.forEach(p => p.draw(this.ctx, this.scaleFactor)); this.entities.forEach(e => e.draw(this.ctx, this.scaleFactor));
        
        this.ctx.restore();
        // フラッシュエフェクト（全画面）
        if (this.flashOpacity > 0) { this.ctx.save(); this.ctx.globalAlpha = this.flashOpacity; this.ctx.fillStyle = this.flashColor; this.ctx.fillRect(0, 0, this.width, this.height); this.ctx.restore(); }
    }

    // 出現予告マーカーの描画
    drawSpawnWarnings() {
        this.spawnWarnings.forEach(w => {
            const alpha = (Math.sin(Date.now() / 50) + 1) / 2 * 0.6;
            
            let strokeColor = `rgba(255, 0, 0, ${alpha})`;
            let fillColor = `rgba(255, 0, 0, ${alpha * 0.3})`;
            
            if (w.isPlayer) {
                strokeColor = `rgba(0, 240, 255, ${alpha})`;
                fillColor = `rgba(0, 240, 255, ${alpha * 0.3})`;
            }

            this.ctx.strokeStyle = strokeColor; 
            this.ctx.lineWidth = 4 / this.scaleFactor; 
            this.ctx.beginPath();
            
            // プレイヤーは1.0秒で出現、エンドレスの敵は2.0秒、初期配置の敵は1.0秒
            const maxTime = w.isPlayer ? 1.0 : (this.frameCount < 60 ? 1.0 : 2.0); 
            
            this.ctx.arc(w.x, w.y, PLAYER_RADIUS * 3 * (w.timer / maxTime + 0.5), 0, Math.PI * 2); 
            this.ctx.stroke();
            this.ctx.fillStyle = fillColor; 
            this.ctx.fill();
        });
    }

    // チュートリアルのターゲットエリア描画
    drawTutorialTarget() {
        if (this.gameMode === GameMode.TUTORIAL && this.tutorialStep === 0 && this.tutorialTarget) {
            const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
            const radius = 100 + pulse * 10;
            
            this.ctx.save();
            this.ctx.strokeStyle = COLOR_ITEM_CAPTURE;
            this.ctx.lineWidth = 2 / this.scaleFactor;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(this.tutorialTarget.x, this.tutorialTarget.y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = COLOR_ITEM_CAPTURE;
            this.ctx.globalAlpha = 0.2 + pulse * 0.1;
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    // 外枠（デスライン）の描画
    drawBoundaries() {
        const borderWidth = 20; const isGameOver = this.gameState === GameState.GAME_OVER;
        const player = this.entities.find(e => e.isPlayer);
        const isPowered = player?.massMultiplier! > 1.0; const isInverted = player?.isInversionActive();
        const colorBase = isGameOver ? '255, 0, 0' : (isInverted ? '50, 205, 50' : (isPowered ? '0, 240, 255' : '255, 0, 50'));
        const gradient = this.ctx.createRadialGradient(this.logicalWidth/2, this.logicalHeight/2, Math.min(this.logicalWidth, this.logicalHeight) * 0.4, this.logicalWidth/2, this.logicalHeight/2, Math.max(this.logicalWidth, this.logicalHeight) * 0.8);
        gradient.addColorStop(0, `rgba(${colorBase}, 0)`); gradient.addColorStop(1, `rgba(${colorBase}, 0.1)`);
        this.ctx.fillStyle = gradient; this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        this.ctx.strokeStyle = `rgba(${colorBase}, 0.5)`; this.ctx.lineWidth = borderWidth; this.ctx.strokeRect(0, 0, this.logicalWidth, this.logicalHeight);
        const cornerSize = 120; this.ctx.strokeStyle = isGameOver ? '#FF0000' : (isInverted ? COLOR_ITEM_INVERSION : (isPowered ? '#00F0FF' : '#FF3333')); this.ctx.lineWidth = 25;
        const drawCorner = (x: number, y: number, dx: number, dy: number) => { this.ctx.beginPath(); this.ctx.moveTo(x + dx * cornerSize, y); this.ctx.lineTo(x, y); this.ctx.lineTo(x, y + dy * cornerSize); this.ctx.stroke(); };
        drawCorner(0, 0, 1, 1); drawCorner(this.logicalWidth, 0, -1, 1); drawCorner(this.logicalWidth, this.logicalHeight, -1, -1); drawCorner(0, this.logicalHeight, 1, -1);
    }

    // 背景グリッドの描画（移動しているように見せるアニメーション含む）
    drawGrid() {
        const step = 70; const isGameOver = this.gameState === GameState.GAME_OVER;
        const player = this.entities.find(e => e.isPlayer);
        const isPowered = player?.massMultiplier! > 1.0; const isInverted = player?.isInversionActive();
        const div = isGameOver ? 20 : (isPowered ? 30 : 50);
        this.ctx.strokeStyle = isGameOver ? 'rgba(255, 0, 0, 0.4)' : (isInverted ? 'rgba(50, 205, 50, 0.5)' : (isPowered ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 100, 255, 0.3)')); 
        this.ctx.lineWidth = 1 / this.scaleFactor; this.ctx.beginPath();
        for (let x = (Date.now() / div) % step; x <= this.logicalWidth; x += step) { this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.logicalHeight); }
        for (let y = (Date.now() / div) % step; y <= this.logicalHeight; y += step) { this.ctx.moveTo(0, y); this.ctx.lineTo(this.logicalWidth, y); }
        this.ctx.stroke();
    }

    // 重力結合線（エンティティ間の線）の描画
    // 距離が近いほど、または質量が大きいほど太く濃く描画
    drawGravityLines(ctx: CanvasRenderingContext2D, scaleFactor: number) {
        ctx.save();
        
        for (let i = 0; i < this.entities.length; i++) {
            for (let j = i + 1; j < this.entities.length; j++) {
                const A = this.entities[i], B = this.entities[j];
                if (A.owner === B || B.owner === A) continue;
                if (A.isSatellite && B.isSatellite) continue;
                const aVisualOpacity = A.isPlayer ? (A.stealthTimer > 0 ? 0 : 1) : A.stealthOpacity;
                const bVisualOpacity = B.isPlayer ? (B.stealthTimer > 0 ? 0 : 1) : B.stealthOpacity;
                const stealthLineAlpha = Math.min(aVisualOpacity, bVisualOpacity);
                if (stealthLineAlpha <= 0.05) continue;
                const dx = B.pos.x - A.pos.x; const dy = B.pos.y - A.pos.y; const distSq = dx * dx + dy * dy;
                if (distSq < 640000) {
                    const dist = Math.sqrt(distSq); const baseOpacity = Math.pow(1 - (dist / 800), 2) * 0.7;
                    const anyHeavy = A.massMultiplier > 1.0 || B.massMultiplier > 1.0;
                    const anyInverted = A.isInversionActive() || B.isInversionActive();
                    const opacity = (anyHeavy ? baseOpacity * 1.5 : baseOpacity) * stealthLineAlpha;
                    const grad = this.ctx.createLinearGradient(A.pos.x, A.pos.y, B.pos.x, B.pos.y);
                    if (anyInverted) { grad.addColorStop(0, `rgba(50, 205, 50, ${opacity})`); grad.addColorStop(1, `rgba(50, 205, 50, ${opacity})`); }
                    else { grad.addColorStop(0, A.isSatellite ? `rgba(255,255,255, ${opacity})` : `rgba(0, 240, 255, ${opacity})`); grad.addColorStop(1, B.isSatellite ? `rgba(255,255,255, ${opacity})` : `rgba(255, 0, 85, ${opacity})`); }
                    this.ctx.strokeStyle = grad; this.ctx.lineWidth = anyHeavy ? (G_LINE_WIDTH * 3) / this.scaleFactor : (G_LINE_WIDTH) / this.scaleFactor;
                    this.ctx.beginPath(); this.ctx.moveTo(A.pos.x, A.pos.y); this.ctx.lineTo(B.pos.x, B.pos.y); this.ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    // ゲームループ
    loop(timestamp: number) {
        if (!this.isLoopRunning) this.isLoopRunning = true;
        // デルタタイム計算（最大0.1秒に制限して不安定化を防ぐ）
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); 
        this.lastTime = timestamp; 
        
        this.update(dt); 
        this.draw();
        
        this.animationId = requestAnimationFrame((t) => this.loop(t));
    }

    // ゲーム停止・破棄
    stop() { cancelAnimationFrame(this.animationId); this.isLoopRunning = false; window.removeEventListener('resize', this.resizeHandler); }
}