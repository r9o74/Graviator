import { Vector2 } from './Vector2.ts';
import { InputState, GameState, GameStats, GameMode, Difficulty } from '../types.ts';

// デバイス検知（モバイルかどうかの判定）
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// --- ゲーム定数定義 ---
// 物理演算やゲームバランスに関わるパラメータ
const PLAYER_RADIUS = 12.0;           // プレイヤーの半径
const ENTITY_MASS = 10.0;             // 基本質量
// 以下の値はデフォルト値として保持し、難易度によってクラス内でオーバーライドされる
const DEFAULT_GRAVITY_CONSTANT = 40000.0;     
const DEFAULT_CPU_THRUST_FORCE = 1800.0;      
const DEFAULT_ENEMY_NUMBER_SURVIVAL = 10;     

const GRAVITY_MAX = 250000.0;         // 重力の最大値制限（特異点回避）
const THRUST_FORCE = 1800.0;          // プレイヤーの推進力
const BREAKING_CONSTANT = 3.5;        // 壁際などでの減速係数
const WALL_MARGIN = 150;              // 壁からの危険エリア距離
const BREAK_BOOST = 25;               // 減速力のブースト係数
const ENEMY_NUMBER_ENDLESS = 5;       // エンドレスモードの初期敵数
const SAFE_DISTANCE = 200;            // スポーン時の安全距離
const DIST_EXP = 0.88;                // 引力計算の距離の指数（1.0で物理的に正しい逆二乗則に近い挙動だが、ゲーム用に調整）
const G_LINE_WIDTH = 1;               // 重力結合線の描画幅
const TRAIL_WIDTH = PLAYER_RADIUS / 1.8; // 軌跡の幅
const FRICTION = 0.100;               // 空間摩擦係数
const FRICTION_VEL_EXP = 0.0;         // 摩擦の速度依存指数


const BASE_LOGICAL_SIZE = IS_MOBILE ? 800 : 700; // 画面サイズの基準値
const BASE_AREA = BASE_LOGICAL_SIZE * BASE_LOGICAL_SIZE; 

const TRAIL_LENGTH = 70;             // 軌跡の長さ
// カラーパレット
const COLOR_PLAYER = '#00F0FF';       // シアン（プレイヤー）
const COLOR_ENEMY = '#FF0055';        // マゼンタ（敵）
const COLOR_PARTICLE = '#FFFFFF';     // パーティクル基本色
const COLOR_ITEM_MASS = '#FFD700';    // 質量増加（金）
const COLOR_ITEM_SATELLITE = '#E0E0E0'; // 衛星（白銀）
const COLOR_ITEM_STEALTH = '#646464'; // 透明化（灰）
const COLOR_ITEM_WAVE = '#BF40BF';    // 重力波（紫）
const COLOR_ITEM_INVERSION = '#32CD32'; // 反転（緑）
const COLOR_ITEM_REPULSIVE = '#FF3300'; // 軌斥（赤）
const COLOR_ITEM_CAPTURE = '#FF8C00';   // 強奪（ダークオレンジ）

const PARTICLE_PHYSICAL_RADIUS = 1.5; // スラスト粒子の大きさ（基準値）
const LABEL_PHYSICAL_FONT_SIZE = 14;  // ラベルフォントサイズ

// アイテムスポーン設定
const ITEM_RADIUS = 15; 
const ITEM_AREA_RADIUS = 30; 
const ITEM_SPAWN_START_DELAY = 3.0; 
const ITEM_SPAWN_INTERVAL_MIN = 2.0;
const ITEM_SPAWN_INTERVAL_MAX = 4.0;


// アイテム出現比率
// 質量増加：衛星：透明化：重力波：反転：軌斥：強奪
const item_ratio = [1, 1, 1, 1, 1, 1, 1]; 


// --- アイテム効果パラメータ ---
// 質量増加
const POWERUP_DURATION = 6.0;
const MASS_BOOST_MULTIPLIER = 7.0;

// 衛星
const SATELLITE_MASS = 10.0;
const SATELLITE_RADIUS = 6.0;
const SATELLITE_THRUST = 3000.0;
const SATELLITE_NUM = 7;
const SATELLITE_TRAIL_LENGTH = 50;

// 透明化
const STEALTH_FADE_DURATION = 1.0;
const STEALTH_INVIS_DURATION = 8.0; 
const STEALTH_TOTAL_DURATION = STEALTH_FADE_DURATION * 2 + STEALTH_INVIS_DURATION;
const GRAVITY_REDUCTION = 0.30; // 重力影響の軽減率

// 重力波
const WAVE_SPEED = 700.0;
const WAVE_FORCE = 45000.0;
const WAVE_DURATION = 0.15;
const WAVE_INTERVAL = 1.0;
const WAVE_MAX_RADIUS = 600.0;

// 反転
const INVERSION_DURATION = 7.0;
const INVERSION_MULTIPLE_1 = 5.0;  // 自分 -> 敵 への斥力倍率
const INVERSION_MULTIPLE_2 = 0.05; // 敵 -> 自分 への斥力倍率

// 軌斥 (Repulsive Trail)
const REPULSIVE_TRAIL_DURATION = 7.0;
const REPULSIVE_TRAIL_RESTITUTION = 2.0; // 法線方向反発係数
const REPULSIVE_TRAIL_RESTITUTION_TAN = 0.5; // 接線方向反発係数
const TRAIL_LENGTH_EXTENDED = 3000; // トレイル最大長さ（壁を作るため長くする）

// 強奪 (Capture)
const CAPTURE_DURATION = 8.0;
const CAPTURE_RADIUS = 100.0;
const CAPTURE_REQUIRED_TIME = 0.3; // 強奪完了に必要な継続時間


// アイテムの種類定義
export enum ItemType {
    MASS_BOOST,      // 質量増加
    SATELLITE,       // 衛星
    INVISIBILITY,    // 透明化
    GRAVITY_WAVE,    // 重力波
    INVERSION,       // 引力反転
    REPULSIVE_TRAIL, // 斥力トレイル
    CAPTURE          // 能力強奪
}

// 軌跡の座標点
interface Point { x: number; y: number; isRepulsive?: boolean; }
// 出現警告マーカー
interface SpawnWarning { x: number; y: number; timer: number; isPlayer?: boolean; }

// 重力波クラス（物理影響あり）
class GravityWave {
    origin: Vector2;
    radius: number = 0;
    owner: Entity;
    hitEntities: Set<Entity> = new Set(); // 既にヒットしたエンティティを記録
    life: number = 1.0;

    constructor(x: number, y: number, owner: Entity) {
        this.origin = new Vector2(x, y);
        this.owner = owner;
    }

    // 波の更新と衝突判定
    update(dt: number, entities: Entity[]) {
        this.radius += WAVE_SPEED * dt;
        this.life = 1.0 - (this.radius / WAVE_MAX_RADIUS);
        if (this.life <= 0) return;

        for (const entity of entities) {
            // 自分や所有者は除外、既に当たったものも除外
            if (entity === this.owner || entity.owner === this.owner || this.hitEntities.has(entity)) continue;
            
            const dx = entity.pos.x - this.origin.x;
            const dy = entity.pos.y - this.origin.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 波の半径付近にいるエンティティに力を加える
            if (Math.abs(dist - this.radius) < 20) {
                const angle = Math.atan2(dy, dx);
                const dir = new Vector2(Math.cos(angle), Math.sin(angle));
                const decay = Math.max(0.2, this.life);
                
                // 反転状態なら引き寄せる、通常なら弾き飛ばす
                const forceMagnitude = entity.isInversionActive() ? -WAVE_FORCE : WAVE_FORCE;
                
                entity.waveForce = dir.scale(forceMagnitude * decay);
                entity.waveForceTimer = WAVE_DURATION;
                this.hitEntities.add(entity);
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, scaleFactor: number) {
        if (this.life <= 0) return;
        ctx.save();
        const color = '191, 64, 191';
        // 波の描画
        ctx.beginPath();
        ctx.arc(this.origin.x, this.origin.y, Math.max(0, this.radius), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${color}, ${Math.min(this.life * 1.2, 0.8)})`;
        ctx.lineWidth = 10 / scaleFactor;
        ctx.stroke();
        // 内側の波
        const innerRadius = this.radius - 15;
        if (innerRadius > 0) {
            ctx.beginPath();
            ctx.arc(this.origin.x, this.origin.y, innerRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${color}, ${this.life * 0.3})`;
            ctx.lineWidth = 4 / scaleFactor;
            ctx.stroke();
        }
        ctx.restore();
    }
}

// 物理判定のない視覚的のみの波（エフェクト用）
class VisualWave {
    origin: Vector2;
    radius: number = 0;
    maxRadius: number = 150;
    color: string;
    life: number = 1.0;
    speed: number = 400.0;

    constructor(x: number, y: number, color: string) {
        this.origin = new Vector2(x, y);
        this.color = color;
    }

    update(dt: number) {
        this.radius += this.speed * dt;
        this.life = 1.0 - (this.radius / this.maxRadius);
    }

    draw(ctx: CanvasRenderingContext2D, scaleFactor: number) {
        if (this.life <= 0) return;
        ctx.save();
        
        ctx.beginPath();
        ctx.arc(this.origin.x, this.origin.y, Math.max(0, this.radius), 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life * 1.2);
        ctx.lineWidth = 5 / scaleFactor;
        ctx.stroke();
        // ...
        ctx.restore();
    }
}

// パーティクルクラス（エフェクト）
class Particle {
    pos: Vector2;
    vel: Vector2;
    life: number;
    maxLife: number;
    color: string;
    sizeMultiplier: number;

    constructor(x: number, y: number, vel: Vector2, color: string = COLOR_PARTICLE, lifeMultiplier: number = 1.0, sizeMultiplier: number = 1.0) {
        this.pos = new Vector2(x, y);
        this.vel = vel;
        this.life = 1.0;
        this.maxLife = (0.2 + Math.random() * 0.4) * lifeMultiplier;
        this.color = color;
        this.sizeMultiplier = sizeMultiplier;
    }
    update(dt: number) {
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        this.life -= dt / this.maxLife;
    }
    draw(ctx: CanvasRenderingContext2D, scaleFactor: number) {
        if (this.life <= 0.01) return;
        ctx.globalAlpha = Math.max(0, this.life) * 0.9;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const radius = (PARTICLE_PHYSICAL_RADIUS * this.sizeMultiplier) / Math.pow(scaleFactor, 0.7);
        ctx.arc(this.pos.x, this.pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

// アイテムクラス
export class Item {
    pos: Vector2;
    type: ItemType;
    angle: number = 0; // 回転用
    constructor(x: number, y: number, type: ItemType) {
        this.pos = new Vector2(x, y);
        this.type = type;
    }
    update(dt: number) {
        this.angle += dt * 3;
    }
    draw(ctx: CanvasRenderingContext2D, scaleFactor: number) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angle);
        // アイテムタイプに応じた色と形状の描画
        let color = COLOR_ITEM_MASS;
        if (this.type === ItemType.SATELLITE) color = COLOR_ITEM_SATELLITE;
        else if (this.type === ItemType.INVISIBILITY) color = COLOR_ITEM_STEALTH;
        else if (this.type === ItemType.GRAVITY_WAVE) color = COLOR_ITEM_WAVE;
        else if (this.type === ItemType.INVERSION) color = COLOR_ITEM_INVERSION;
        else if (this.type === ItemType.REPULSIVE_TRAIL) color = COLOR_ITEM_REPULSIVE;
        else if (this.type === ItemType.CAPTURE) color = COLOR_ITEM_CAPTURE;
        
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
        ctx.shadowBlur = 15 + pulse * 10;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        const size = ITEM_RADIUS;
        if (this.type === ItemType.MASS_BOOST) {
            ctx.moveTo(0, -size); ctx.lineTo(size * 0.7, 0); ctx.lineTo(0, size); ctx.lineTo(-size * 0.7, 0);
        } else if (this.type === ItemType.SATELLITE) {
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const r = size * (0.8 + pulse * 0.1);
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
        } else if (this.type === ItemType.INVISIBILITY) {
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const r = size * (0.6 + pulse * 0.4);
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
        } else if (this.type === ItemType.GRAVITY_WAVE) {
             ctx.arc(0, 0, size * (0.5 + pulse * 0.2), 0, Math.PI * 2); ctx.moveTo(size, 0); ctx.arc(0, 0, size, 0, Math.PI * 2);
        } else if (this.type === ItemType.INVERSION) {
            ctx.moveTo(0, size); ctx.lineTo(size, -size * 0.6); ctx.lineTo(-size, -size * 0.6);
        } else if (this.type === ItemType.REPULSIVE_TRAIL) {
            const spikes = 5;
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (i / (spikes * 2)) * Math.PI * 2;
                const r = size * (i % 2 === 0 ? 1.0 : 0.4);
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
        } else if (this.type === ItemType.CAPTURE) {
            // Hexagon with dot
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
            }
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#000000'; // Hole
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            // Restore color for stroke
            ctx.fillStyle = color;
        }
        ctx.closePath(); 
        if (this.type !== ItemType.CAPTURE) ctx.fill(); 
        
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2 / scaleFactor; ctx.stroke();
        ctx.restore();
    }
}

// エンティティクラス（プレイヤー、敵、衛星など）
class Entity {
    pos: Vector2; vel: Vector2; acc: Vector2; 
    radius: number; mass: number; color: string; 
    isPlayer: boolean; isCpu: boolean; 
    breakingValue: number; // 壁際でのブレーキ強度
    trail: Point[];        // 移動軌跡
    
    // バフ・デバフタイマー
    massMultiplier: number = 1.0;
    thrustMultiplier: number = 1.0;
    powerupTimer: number = 0;
    stealthTimer: number = 0;
    stealthOpacity: number = 1.0;
    inversionTimer: number = 0;
    repulsiveTrailTimer: number = 0;
    captureTimer: number = 0;
    
    // 強奪スキル用
    captureProgress: Map<Entity, number> = new Map();
    
    // 重力波スキル用
    waveChargeCount: number = 0;
    waveChargeTimer: number = 0;
    waveForce: Vector2 = new Vector2(); // 外部から受ける重力波の力
    waveForceTimer: number = 0;
    
    // 衛星用
    isSatellite: boolean = false;
    owner: Entity | null = null;
    
    constructor(x: number, y: number, isPlayer: boolean, isSatellite: boolean = false, owner: Entity | null = null) {
        this.pos = new Vector2(x, y); this.vel = new Vector2(); this.acc = new Vector2();
        this.isSatellite = isSatellite; this.owner = owner;
        this.radius = isSatellite ? SATELLITE_RADIUS : PLAYER_RADIUS;
        this.mass = isSatellite ? SATELLITE_MASS : ENTITY_MASS;
        this.isPlayer = isPlayer; this.isCpu = !isPlayer && !isSatellite;
        this.color = isSatellite ? '#FFFFFF' : (isPlayer ? COLOR_PLAYER : COLOR_ENEMY);
        this.breakingValue = 0; this.trail = [];
    }
    
    // 現在の質量（バフ込み）
    getCurrentMass(): number { return this.mass * this.massMultiplier; }

    // 力を加える（F=ma => a=F/m）
    applyForce(force: Vector2) {
        this.acc.x += force.x / this.getCurrentMass();
        this.acc.y += force.y / this.getCurrentMass();
    }

    isStealthActive(): boolean { return this.stealthTimer > 0; }
    isInversionActive(): boolean { return this.inversionTimer > 0; }
    isCaptureActive(): boolean { return this.captureTimer > 0; }
    
    // 敵AIなどがターゲットとして認識できるか
    isTargetable(): boolean {
        if (this.isPlayer) return this.stealthTimer <= 0;
        return this.stealthOpacity > 0.1;
    }

    update(dt: number) {
        // タイマー更新処理
        if (this.powerupTimer > 0) {
            this.powerupTimer -= dt;
            if (this.powerupTimer <= 0) { this.massMultiplier = 1.0; this.thrustMultiplier = 1.0; }
        }
        if (this.inversionTimer > 0) this.inversionTimer -= dt;
        if (this.captureTimer > 0) this.captureTimer -= dt;
        
        // 斥力トレイル処理
        if (this.repulsiveTrailTimer > 0) {
            this.repulsiveTrailTimer -= dt;
            if (this.repulsiveTrailTimer <= 0) {
                // 効果終了時、全軌跡の斥力フラグを解除し、軌跡長さを通常に戻す
                this.repulsiveTrailTimer = 0;
                this.trail.forEach(p => p.isRepulsive = false);
                if (this.trail.length > TRAIL_LENGTH) {
                    this.trail = this.trail.slice(this.trail.length - TRAIL_LENGTH);
                }
            }
        }

        // 透明化処理（フェードイン・アウト）
        if (this.stealthTimer > 0) {
            this.stealthTimer -= dt;
            const elapsed = STEALTH_TOTAL_DURATION - this.stealthTimer;
            if (this.isPlayer) this.stealthOpacity = 0.30;
            else {
                if (elapsed < STEALTH_FADE_DURATION) this.stealthOpacity = 1.0 - (elapsed / STEALTH_FADE_DURATION);
                else if (this.stealthTimer < STEALTH_FADE_DURATION) this.stealthOpacity = 1.0 - (this.stealthTimer / STEALTH_FADE_DURATION);
                else this.stealthOpacity = 0;
            }
            if (this.stealthTimer <= 0) { this.stealthOpacity = 1.0; this.stealthTimer = 0; }
        } else { this.stealthOpacity = 1.0; }
        
        // 重力波によるノックバック適用
        if (this.waveForceTimer > 0) { this.applyForce(this.waveForce); this.waveForceTimer -= dt; }
        
        // 速度の更新
        this.vel.x += this.acc.x * dt; 
        this.vel.y += this.acc.y * dt;
        
        // 摩擦（空気抵抗的な減速）
        const speed = this.vel.length();
        if (speed > 0) {
            const frictionForceMagnitude = FRICTION * Math.pow(speed, FRICTION_VEL_EXP);
            const frictionAccMagnitude = frictionForceMagnitude / this.getCurrentMass();
            const frictionDecel = frictionAccMagnitude * dt;
            
            if (frictionDecel >= speed) {
                this.vel.x = 0; this.vel.y = 0;
            } else {
                const factor = (speed - frictionDecel) / speed;
                this.vel.x *= factor; this.vel.y *= factor;
            }
        }

        // 位置の更新
        this.pos.x += this.vel.x * dt; 
        this.pos.y += this.vel.y * dt;
        
        // 加速度のリセット
        this.acc.x = 0; this.acc.y = 0;
        
        // 軌跡の更新
        const maxLen = this.repulsiveTrailTimer > 0 ? TRAIL_LENGTH_EXTENDED : this.isSatellite ? SATELLITE_TRAIL_LENGTH : TRAIL_LENGTH;
        if (this.trail.length > maxLen) this.trail.shift();
        this.trail.push({ 
            x: this.pos.x, 
            y: this.pos.y,
            isRepulsive: this.repulsiveTrailTimer > 0
        });
    }

    draw(ctx: CanvasRenderingContext2D, scaleFactor: number) {
        if (this.stealthOpacity <= 0 && this.repulsiveTrailTimer <= 0 && !this.isCaptureActive()) return;

        const isPowered = this.massMultiplier > 1.0;
        const isInverted = this.isInversionActive();
        const isCapturing = this.isCaptureActive();
        
        // 本体描画：透明度の影響を受ける
        ctx.save(); 
        ctx.globalAlpha = this.stealthOpacity;

        const stealthTrailAlpha = this.stealthOpacity;
        const blurFactor = (this.isPlayer && this.isStealthActive()) ? 0 : 1.0;

        if (this.trail.length > 1 && (stealthTrailAlpha > 0 || this.repulsiveTrailTimer > 0)) {
            // Normal Trail
            if (stealthTrailAlpha > 0) {
                ctx.beginPath();
                let moved = false;
                for (let i = 0; i < this.trail.length; i++) {
                    if (this.trail[i].isRepulsive) {
                        if (moved) ctx.stroke();
                        moved = false;
                        ctx.beginPath(); // Break path
                        continue; 
                    }
                    if (!moved) { ctx.moveTo(this.trail[i].x, this.trail[i].y); moved = true; }
                    else { ctx.lineTo(this.trail[i].x, this.trail[i].y); }
                }
                if (moved) {
                    const gradient = ctx.createLinearGradient(this.trail[0].x, this.trail[0].y, this.pos.x, this.pos.y);
                    gradient.addColorStop(0, 'rgba(0,0,0,0)'); 
                    gradient.addColorStop(1, this.color);
                    ctx.strokeStyle = gradient; 
                    ctx.lineWidth = isPowered ? TRAIL_WIDTH * 2 : (this.isSatellite ? TRAIL_WIDTH * 0.8 : TRAIL_WIDTH);
                    ctx.lineCap = 'round'; 
                    ctx.lineJoin = 'round'; 
                    ctx.stroke();
                }
            }

            // Repulsive Trail (Red, vibrating)
            if (this.repulsiveTrailTimer > 0) {
                ctx.save();
                ctx.globalAlpha = 1.0; // Repulsive trail is always visible even in stealth
                ctx.shadowColor = COLOR_ITEM_REPULSIVE;
                ctx.shadowBlur = 10;
                ctx.strokeStyle = COLOR_ITEM_REPULSIVE;
                ctx.lineWidth = TRAIL_WIDTH * 1.5;
                
                ctx.beginPath();
                let rMoved = false;
                for (let i = 0; i < this.trail.length; i++) {
                    if (!this.trail[i].isRepulsive) {
                        if (rMoved) ctx.stroke();
                        rMoved = false;
                        ctx.beginPath();
                        continue;
                    }
                    const jitterX = (Math.random() - 0.5) * 3;
                    const jitterY = (Math.random() - 0.5) * 3;
                    if (!rMoved) { ctx.moveTo(this.trail[i].x + jitterX, this.trail[i].y + jitterY); rMoved = true; }
                    else { ctx.lineTo(this.trail[i].x + jitterX, this.trail[i].y + jitterY); }
                }
                if (rMoved) ctx.stroke();
                ctx.restore();
            }
        }

        // Capture Range Aura (常に表示)
        if (isCapturing) {
            ctx.save();
            ctx.strokeStyle = COLOR_ITEM_CAPTURE;
            ctx.lineWidth = 3 / scaleFactor;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, CAPTURE_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = COLOR_ITEM_CAPTURE;
            ctx.globalAlpha = 0.1;
            ctx.fill();
            ctx.restore();
        }

        if (this.stealthOpacity > 0) {
            const auraPulse = (Math.sin(Date.now() / 100) + 1) / 2;

            // リング描画（動的調整）
            const activeEffects = [];
            // 優先順位: 外側から 質量増加(Mass) -> 反転(Invert) -> 奪取(Capture)
            // 描画ループで半径を広げていくため、リストには「内側 -> 外側」の順で追加する
            // つまり: Capture -> Invert -> Mass
            if (isCapturing) activeEffects.push({ color: COLOR_ITEM_CAPTURE, glow: 10 });
            if (isInverted) activeEffects.push({ color: COLOR_ITEM_INVERSION, glow: 10 });
            if (isPowered) activeEffects.push({ color: this.color, glow: 15 });

            const effectCount = activeEffects.length;

            if (effectCount > 0) {
                activeEffects.forEach((effect, index) => {
                    let rBase = 1.5;
                    let widthBase = 4.0;
                    
                    if (effectCount === 1) {
                        rBase = 1.6;
                        widthBase = 4.0;
                    } else if (effectCount === 2) {
                        rBase = 1.5 + (index * 0.5); // 1.5, 2.0
                        widthBase = 3.0;
                    } else if (effectCount === 3) {
                        rBase = 1.4 + (index * 0.4); // 1.4, 1.8, 2.2
                        widthBase = 2.5;
                    }
                    
                    ctx.shadowBlur = effect.glow * blurFactor;
                    ctx.shadowColor = effect.color;
                    ctx.strokeStyle = effect.color;
                    ctx.lineWidth = widthBase / scaleFactor;
                    
                    ctx.beginPath();
                    // パルスは全リング同期させる
                    ctx.arc(this.pos.x, this.pos.y, this.radius * (rBase + auraPulse * 0.2), 0, Math.PI * 2);
                    ctx.stroke();
                });
            }

            ctx.shadowBlur = (isPowered ? 40 : (this.isSatellite ? 15 : 30)) * blurFactor;
            ctx.shadowColor = this.color; ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, isPowered ? this.radius * 1.2 : this.radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, (isPowered ? this.radius * 1.2 : this.radius) * 0.4, 0, Math.PI * 2); ctx.fill();
        }
        
        ctx.restore(); // 本体描画終了、不透明度設定リセット

        // ラベル描画：透明度の影響を受けない（特にプレイヤー）
        if (this.isPlayer || ((isPowered || isInverted || isCapturing) && this.stealthOpacity > 0.5)) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            const fontSize = Math.round(LABEL_PHYSICAL_FONT_SIZE / scaleFactor);
            ctx.font = `${fontSize * 0.9}px JetBrains Mono`; ctx.textAlign = 'center';
            let label = this.isPlayer ? "YOU" : "ENEMY";
            if (isPowered) label = "HEAVY";
            if (isInverted) label = "REPULS";
            if (this.repulsiveTrailTimer > 0) label = "TRAIL";
            if (isCapturing) label = "CAPTURE";

            let label_dist = 20;
            if (isPowered) label_dist += 4;
            if (isInverted) label_dist += 4;
            if (this.repulsiveTrailTimer > 0) label_dist += 4;
            if (isCapturing) label_dist += 4;
            if (this.isStealthActive()) label_dist += 4;
            
            const labelY = this.pos.y - (label_dist / scaleFactor);
            ctx.fillText(label, this.pos.x, labelY);

            // インジケーターバー描画
            const barWidth = 40 / scaleFactor;
            const barHeight = 3 / scaleFactor;
            const spacing = 2 / scaleFactor;
            let currentBarY = labelY + (3 / scaleFactor); // ラベルの少し下

            const effects = [];
            if (this.powerupTimer > 0) effects.push({ ratio: this.powerupTimer / POWERUP_DURATION, color: COLOR_ITEM_MASS });
            if (this.stealthTimer > 0) effects.push({ ratio: this.stealthTimer / STEALTH_TOTAL_DURATION, color: COLOR_ITEM_STEALTH });
            if (this.inversionTimer > 0) effects.push({ ratio: this.inversionTimer / INVERSION_DURATION, color: COLOR_ITEM_INVERSION });
            if (this.repulsiveTrailTimer > 0) effects.push({ ratio: this.repulsiveTrailTimer / REPULSIVE_TRAIL_DURATION, color: COLOR_ITEM_REPULSIVE });
            if (this.captureTimer > 0) effects.push({ ratio: this.captureTimer / CAPTURE_DURATION, color: COLOR_ITEM_CAPTURE });

            for (const effect of effects) {
                // 背景
                ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
                ctx.fillRect(this.pos.x - barWidth / 2, currentBarY, barWidth, barHeight);
                // バー
                ctx.fillStyle = effect.color;
                ctx.fillRect(this.pos.x - barWidth / 2, currentBarY, barWidth * effect.ratio, barHeight);
                
                currentBarY += barHeight + spacing;
            }

            ctx.restore();
        }
    }
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
        this.startTime = Date.now() + 1000; 
        this.maxSpeedRecorded = 0; this.maxGravityRecorded = 0; this.killCount = 0; this.frameCount = 0;
        this.itemSpawnTimer = ITEM_SPAWN_START_DELAY + 1.0;
        
        // プレイヤーと敵のスポーン設定
        const safeMarginX = this.logicalWidth * 0.15;
        const safeMarginY = this.logicalHeight * 0.15;
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
        if (!this.isLoopRunning) this.loop(this.lastTime);
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
        this.flashOpacity = entity.isPlayer ? 0.9 : (entity.isSatellite ? 0.1 : 0.6);
        this.flashColor = entity.color;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2; const speed = 100 + Math.random() * 500;
            const vel = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            this.particles.push(new Particle(entity.pos.x, entity.pos.y, vel, entity.color, 2.0));
        }
    }

    handleInput(input: InputState) { this.input = input; }

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
        const count = 10;
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

    // チュートリアルシナリオの進行
    updateTutorial(dt: number) {
        const player = this.entities.find(e => e.isPlayer);
        
        // ステップ1: 移動操作の確認
        if (this.tutorialStep === 0) {
            this.tutorial_step_show = "STEP 1/3";
            this.tutorialMessage = "WASD,矢印キーまたはスワイプで移動";
            if (player && player.vel.length() > 200) {
                this.tutorialTimer += dt;
                if (this.tutorialTimer > 1.0) {
                    this.tutorialStep = 1;
                    this.tutorialTimer = 0;
                    
                    // 敵をスポーン
                    const x = this.logicalWidth / 1.3;
                    const y = this.logicalHeight * 0.35;
                    this.spawnWarnings.push({ x, y, timer: 1.5, isPlayer: false });
                }
            } else {
                this.tutorialTimer = 0;
            }
        }
        // ステップ2: 敵の撃破
        else if (this.tutorialStep === 1) {
            this.tutorial_step_show = "STEP 2/3";
            this.tutorialMessage = "敵に近づき重力で場外へ弾き出せ！";
            const enemies = this.entities.filter(e => e.isCpu);
            const warnings = this.spawnWarnings.filter(w => !w.isPlayer);
            
            if (enemies.length === 0 && warnings.length === 0 && this.tutorialTimer === 0) {
                 // 敵が倒された
                 this.tutorialTimer = 1.0; // Wait before next step
            }
            
            if (this.tutorialTimer > 0) {
                this.tutorialTimer -= dt;
                if (this.tutorialTimer <= 0) {
                    this.tutorialStep = 2;
                    
                    // アイテムと敵をスポーン
                    const cx = this.logicalWidth / 1.3;
                    const cy = this.logicalHeight / 2;
                    this.items.push(new Item(this.logicalWidth / 4, this.logicalHeight / 2, ItemType.MASS_BOOST));
                    this.spawnWarnings.push({ x: cx * 1.1, y: cy, timer: 2.0, isPlayer: false });
                }
            }
        }
        // ステップ3: アイテムの使用
        else if (this.tutorialStep === 2) {
            this.tutorial_step_show = "STEP 3/3";
            this.tutorialMessage = "黄色のアイテムを取り、強化重力で敵を倒せ！";
            const hasPowerUp = player && player.massMultiplier > 1.0;
            const enemies = this.entities.filter(e => e.isCpu);
            const warnings = this.spawnWarnings.filter(w => !w.isPlayer);

            if (enemies.length === 0 && warnings.length === 0) {
                // 敵を倒した（アイテムを取ったかどうかは問わずクリア扱いにするが、文脈的には取ってほしい）
                this.tutorialStep = 3;
                this.tutorialTimer = 2.0; // Victory delay
            }
        }
        // 完了
        else if (this.tutorialStep === 3) {
            this.tutorialMessage = "TUTORIAL COMPLETE!";
            this.tutorialTimer -= dt;
            if (this.tutorialTimer <= 0) {
                this.setGameState(GameState.VICTORY);
            }
        }
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
            else type = ItemType.CAPTURE;

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
                    else if (item.type === ItemType.GRAVITY_WAVE) { entity.waveChargeCount = 2; entity.waveChargeTimer = 0.01; }
                    else if (item.type === ItemType.INVERSION) { entity.inversionTimer = INVERSION_DURATION; }
                    else if (item.type === ItemType.REPULSIVE_TRAIL) { 
                        entity.repulsiveTrailTimer = REPULSIVE_TRAIL_DURATION; 
                        entity.trail = []; // Reset trail immediately to remove previous trail visuals
                    } else if (item.type === ItemType.CAPTURE) {
                        entity.captureTimer = CAPTURE_DURATION;
                    }

                    this.flashOpacity = entity.isPlayer ? 0.4 : 0.2;
                    let fColor = COLOR_ITEM_MASS;
                    if (item.type === ItemType.SATELLITE) fColor = COLOR_ITEM_SATELLITE;
                    else if (item.type === ItemType.INVISIBILITY) fColor = COLOR_ITEM_STEALTH;
                    else if (item.type === ItemType.GRAVITY_WAVE) fColor = COLOR_ITEM_WAVE;
                    else if (item.type === ItemType.INVERSION) fColor = COLOR_ITEM_INVERSION;
                    else if (item.type === ItemType.REPULSIVE_TRAIL) fColor = COLOR_ITEM_REPULSIVE;
                    else if (item.type === ItemType.CAPTURE) fColor = COLOR_ITEM_CAPTURE;
                    
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
                    // Check if victim has anything to steal
                    const buffs: string[] = [];
                    if (victim.powerupTimer > 0) buffs.push(COLOR_ITEM_MASS);
                    if (victim.stealthTimer > 0) buffs.push(COLOR_ITEM_STEALTH);
                    if (victim.inversionTimer > 0) buffs.push(COLOR_ITEM_INVERSION);
                    if (victim.repulsiveTrailTimer > 0) buffs.push(COLOR_ITEM_REPULSIVE);
                    if (victim.waveChargeCount > 0) buffs.push(COLOR_ITEM_WAVE);

                    if (buffs.length > 0) {
                        activeTargetsInFrame.add(victim);
                        const currentProgress = capturer.captureProgress.get(victim) || 0;
                        const nextProgress = currentProgress + dt;
                        capturer.captureProgress.set(victim, nextProgress);

                        // Particle Effect (Suction)
                        // 量を増やす: 1フレームに2個生成して密度を上げる
                        for (let i = 0; i < 2; i++) {
                             const color = buffs[Math.floor(Math.random() * buffs.length)];
                             this.spawnCaptureStreamParticle(victim, capturer, color);
                        }

                        if (nextProgress >= CAPTURE_REQUIRED_TIME) {
                            let stoleSomething = false;

                            // Steal Powerup
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
                            // Steal Stealth
                            if (victim.stealthTimer > 0) {
                                capturer.stealthTimer = Math.max(capturer.stealthTimer, victim.stealthTimer);
                                victim.stealthTimer = 0;
                                victim.stealthOpacity = 1.0;
                                this.spawnTransferParticles(victim, capturer, COLOR_ITEM_STEALTH);
                                this.visualWaves.push(new VisualWave(capturer.pos.x, capturer.pos.y, COLOR_ITEM_STEALTH));
                                stoleSomething = true;
                            }
                            // Steal Inversion
                            if (victim.inversionTimer > 0) {
                                capturer.inversionTimer = Math.max(capturer.inversionTimer, victim.inversionTimer);
                                victim.inversionTimer = 0;
                                this.spawnTransferParticles(victim, capturer, COLOR_ITEM_INVERSION);
                                this.visualWaves.push(new VisualWave(capturer.pos.x, capturer.pos.y, COLOR_ITEM_INVERSION));
                                stoleSomething = true;
                            }
                            // Steal Repulsive Trail
                            if (victim.repulsiveTrailTimer > 0) {
                                capturer.repulsiveTrailTimer = Math.max(capturer.repulsiveTrailTimer, victim.repulsiveTrailTimer);
                                capturer.trail = []; // Reset capturer trail to be safe
                                
                                victim.repulsiveTrailTimer = 0;
                                victim.trail.forEach(p => p.isRepulsive = false); // Clear victim trail effect
                                this.spawnTransferParticles(victim, capturer, COLOR_ITEM_REPULSIVE);
                                this.visualWaves.push(new VisualWave(capturer.pos.x, capturer.pos.y, COLOR_ITEM_REPULSIVE));
                                stoleSomething = true;
                            }
                             // Steal Gravity Wave Charges
                            if (victim.waveChargeCount > 0) {
                                capturer.waveChargeCount += victim.waveChargeCount;
                                capturer.waveChargeTimer = 0.01; // Trigger soon
                                victim.waveChargeCount = 0;
                                this.spawnTransferParticles(victim, capturer, COLOR_ITEM_WAVE);
                                this.visualWaves.push(new VisualWave(capturer.pos.x, capturer.pos.y, COLOR_ITEM_WAVE));
                                stoleSomething = true;
                            }
                            
                            if (stoleSomething) {
                                // Reset progress for this victim to prevent multi-triggering in same frame (logic mostly handled by victim losing buff)
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
                    A.applyForce(fOnA); B.applyForce(fOnB);
                    if (A.isPlayer || B.isPlayer) { 
                        playerTotalGravityForce += A.isPlayer ? fOnA.length() : fOnB.length();
                        minDangerDist = Math.min(minDangerDist, dist - A.radius - B.radius); 
                    }
                }
            }
        }
        
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
        if (this.gameMode === GameMode.SURVIVAL && player && enemiesLeft === 0 && this.gameState === GameState.PLAYING && this.spawnWarnings.length === 0) this.setGameState(GameState.VICTORY);
        this.frameCount++;
        if (this.onStatsUpdate && player && this.frameCount % 5 === 0) {
             this.onStatsUpdate({ 
                 mode: this.gameMode, 
                 difficulty: this.currentDifficulty,
                 speed: player.vel.length(), 
                 gravityForce: playerTotalGravityForce, 
                 maxSpeed: this.maxSpeedRecorded, 
                 maxGravity: this.maxGravityRecorded, 
                 currentEnemies: enemiesLeft, 
                 initialEnemies: this.initialEnemyCount, 
                 timeSurvived: (Date.now() - this.startTime) / 1000, 
                 dangerLevel: Math.max(0, 100 - (minDangerDist / 200) * 100), 
                 kills: this.killCount,
                 tutorialMessage: this.gameMode === GameMode.TUTORIAL ? this.tutorialMessage : undefined,
                 tutorial_step_show: this.gameMode === GameMode.TUTORIAL ? this.tutorial_step_show : undefined
             });
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