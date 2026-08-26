import { Vector2 } from '../Vector2';
import {
    COLOR_PLAYER, COLOR_ENEMY, COLOR_ITEM_MASS, COLOR_ITEM_STEALTH, COLOR_ITEM_INVERSION,
    COLOR_ITEM_REPULSIVE, COLOR_ITEM_CAPTURE, COLOR_ITEM_RAMJET_FRONT, COLOR_ITEM_RAMJET_REAR,
    COLOR_ITEM_WAVE,
    PLAYER_RADIUS, ENTITY_MASS, SATELLITE_RADIUS, SATELLITE_MASS, SATELLITE_TRAIL_LENGTH,
    TRAIL_LENGTH, TRAIL_LENGTH_EXTENDED, TRAIL_WIDTH,
    POWERUP_DURATION, MASS_BOOST_MULTIPLIER, MASS_BOOST_COOLING_TIME, STEALTH_TOTAL_DURATION, STEALTH_FADE_DURATION,
    INVERSION_DURATION, REPULSIVE_TRAIL_DURATION, CAPTURE_DURATION, CAPTURE_RADIUS,
    FRICTION, FRICTION_VEL_EXP, LABEL_PHYSICAL_FONT_SIZE, RAMJET_DURATION,
    WAVE_WAITING, WAVE_INTERVAL
} from '../../constants/gameConfig';

// 軌跡の座標点
export interface Point { x: number; y: number; isRepulsive?: boolean; }

let cachedRamjetCanvas: HTMLCanvasElement | null = null;

function getRamjetCanvas(): HTMLCanvasElement {
    if (cachedRamjetCanvas) return cachedRamjetCanvas;
    
    const radius = 100;
    const canvas = document.createElement('canvas');
    canvas.width = radius * 2;
    canvas.height = radius * 2;
    const ctx = canvas.getContext('2d')!;
    
    ctx.translate(radius, radius);
    
    // 1. Conic gradient for angular fade (cos)
    // createConicGradient is supported in modern browsers
    if (ctx.createConicGradient) {
        const conicGrad = ctx.createConicGradient(0, 0, 0);
        const stops = 32;
        for (let i = 0; i <= stops; i++) {
            const angle = (i / stops) * Math.PI * 2;
            const stop = i / stops;
            let normalizedAngle = angle;
            if (normalizedAngle > Math.PI) normalizedAngle -= Math.PI * 2;
            
            if (Math.abs(normalizedAngle) <= Math.PI / 2) {
                const cosVal = Math.cos(normalizedAngle);
                conicGrad.addColorStop(stop, `rgba(30, 144, 255, ${Math.min(cosVal * 1.5, 1.0)})`);
            } else {
                const cosVal = -Math.cos(normalizedAngle);
                conicGrad.addColorStop(stop, `rgba(255, 69, 0, ${Math.min(cosVal * 1.5, 1.0)})`);
            }
        }
        ctx.fillStyle = conicGrad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Fallback if createConicGradient is not supported (unlikely in modern browsers, but just in case)
        const segments = 60;
        const angleStep = Math.PI / segments;
        for (let i = 0; i < segments; i++) {
            const angle1 = -Math.PI / 2 + i * angleStep;
            const angle2 = angle1 + angleStep + 0.02;
            const midAngle = angle1 + angleStep / 2;
            const cosVal = Math.cos(midAngle);
            ctx.fillStyle = `rgba(30, 144, 255, ${Math.max(cosVal * 1.5, 1.0)})`;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, angle1, angle2); ctx.fill();
        }
        for (let i = 0; i < segments; i++) {
            const angle1 = Math.PI / 2 + i * angleStep;
            const angle2 = angle1 + angleStep + 0.02;
            const midAngle = angle1 + angleStep / 2;
            const cosVal = -Math.cos(midAngle);
            ctx.fillStyle = `rgba(255, 69, 0, ${Math.max(cosVal * 1.5, 1.0)})`;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius, angle1, angle2); ctx.fill();
        }
    }
    
    // 2. Radial gradient for distance fade (masking)
    ctx.globalCompositeOperation = 'destination-in';
    const radialGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    radialGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    
    cachedRamjetCanvas = canvas;
    return canvas;
}

export class Entity {
    pos: Vector2; vel: Vector2; acc: Vector2; 
    radius: number; mass: number; color: string; 
    isPlayer: boolean; isCpu: boolean; 
    breakingValue: number; // 壁際でのブレーキ強度
    trail: Point[];        // 移動軌跡
    
    // バフ・デバフタイマー
    massMultiplier: number = 1.0;
    thrustMultiplier: number = 1.0;
    powerupTimer: number = 0;
    massBoostCoolingTimer: number = 0; // 質量増加効果終了後、他者への重力が回復するまでの残り時間
    stealthTimer: number = 0;
    stealthOpacity: number = 1.0;
    inversionTimer: number = 0;
    repulsiveTrailTimer: number = 0;
    captureTimer: number = 0;
    ramjetTimer: number = 0;
    ramjetFlash: number = 0;
    
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
    isRamjetActive(): boolean { return this.ramjetTimer > 0; }

    // 質量増加を開始（アイテム取得・強奪成功時）
    startMassBoost(duration: number) {
        this.powerupTimer = duration;
        this.massMultiplier = MASS_BOOST_MULTIPLIER;
        this.thrustMultiplier = MASS_BOOST_MULTIPLIER;
        this.massBoostCoolingTimer = 0;
    }

    // 質量増加を終了（自然終了時）：以後MASS_BOOST_COOLING_TIMEの間、他者との重力が軽減される
    endMassBoost() {
        this.powerupTimer = 0;
        this.massMultiplier = 1.0;
        this.thrustMultiplier = 1.0;
        this.massBoostCoolingTimer = MASS_BOOST_COOLING_TIME;
    }

    // 質量増加を強奪された（クールダウンは発動しない）
    loseMassBoostToCapture() {
        this.powerupTimer = 0;
        this.massMultiplier = 1.0;
        this.thrustMultiplier = 1.0;
    }

    // 質量増加クールダウン中の重力軽減倍率（終了直後0倍 → MASS_BOOST_COOLING_TIME経過で1倍に線形回復）
    getMassBoostCoolingFactor(): number {
        if (this.massBoostCoolingTimer <= 0) return 1.0;
        return 1 - (this.massBoostCoolingTimer / MASS_BOOST_COOLING_TIME);
    }

    // 何らかのアイテム効果を保持しているか
    hasActiveItemEffect(): boolean {
        return this.powerupTimer > 0 || this.stealthTimer > 0 || this.inversionTimer > 0 ||
            this.repulsiveTrailTimer > 0 || this.captureTimer > 0 || this.ramjetTimer > 0 ||
            this.waveChargeCount > 0;
    }


    // 敵AIなどがターゲットとして認識できるか
    isTargetable(): boolean {
        if (this.isPlayer) return this.stealthTimer <= 0;
        return this.stealthOpacity > 0.1;
    }

    update(dt: number) {
        // タイマー更新処理
        if (this.powerupTimer > 0) {
            this.powerupTimer -= dt;
            if (this.powerupTimer <= 0) { this.endMassBoost(); }
        }
        if (this.massBoostCoolingTimer > 0) {
            this.massBoostCoolingTimer -= dt;
            if (this.massBoostCoolingTimer < 0) this.massBoostCoolingTimer = 0;
        }
        if (this.inversionTimer > 0) this.inversionTimer -= dt;
        if (this.captureTimer > 0) this.captureTimer -= dt;
        if (this.ramjetTimer > 0) this.ramjetTimer -= dt;
        
        if (this.ramjetFlash > 0) {
            this.ramjetFlash -= dt * 6; // 約0.16秒でフェードアウト
            if (this.ramjetFlash < 0) this.ramjetFlash = 0;
        }
        
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
        const isPowered = this.massMultiplier > 1.0;
        const isInverted = this.isInversionActive();
        const isCapturing = this.isCaptureActive();
        const hasOtherItemEffect = isPowered || isInverted || this.isRamjetActive() ||
            (this.waveChargeCount > 0 && this.waveChargeTimer > 0) || this.ramjetFlash > 0;

        if (this.stealthOpacity <= 0 && this.repulsiveTrailTimer <= 0 && !isCapturing && !hasOtherItemEffect) return;

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
        
        // Ramjet Effect (常に表示)
        if (this.isRamjetActive()) {
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.translate(this.pos.x, this.pos.y);
            ctx.rotate(Math.atan2(this.vel.y, this.vel.x));
            
            const radius = 100;
            ctx.drawImage(getRamjetCanvas(), -radius, -radius);
            
            ctx.restore();
        }

        // Gravity Wave Charge Effect (常に表示)
        if (this.waveChargeCount > 0 && this.waveChargeTimer > 0) {
            ctx.save();
            const timeRemaining = this.waveChargeTimer;
            // Shrink from radius + 100 down to radius
            const chargeRadius = this.radius + timeRemaining * 100;
            
            ctx.strokeStyle = COLOR_ITEM_WAVE;
            ctx.lineWidth = 4 / scaleFactor;
            // Fade in as it gets closer to 0
            ctx.globalAlpha = Math.min(1.0, 1.0 - (timeRemaining / WAVE_INTERVAL));
            
            ctx.translate(this.pos.x, this.pos.y);
            // Rotate the circle as it shrinks
            ctx.rotate(timeRemaining * Math.PI * 2);
            
            ctx.beginPath();
            
            // ビリビリした演出（ジッターを加えた円）
            const numPoints = 60;
            for (let i = 0; i <= numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                // ランダムなブレ（時間経過で激しくなる）
                const jitter = (Math.random() - 0.5) * 20 * (1.0 - timeRemaining / WAVE_INTERVAL);
                const r = chargeRadius + jitter;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            
            // Draw 4 converging lightning arrows
            ctx.lineWidth = 2 / scaleFactor;
            for (let i = 0; i < 7; i++) {
                const angle = (i / 7) * Math.PI * 2;
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                
                ctx.beginPath();
                let startX = cosA * (chargeRadius + 5);
                let startY = sinA * (chargeRadius + 5);
                ctx.moveTo(startX, startY);
                
                // ギザギザの線を描画
                const steps = 4;
                for (let j = 1; j <= steps; j++) {
                    const progress = j / steps;
                    const targetX = cosA * (chargeRadius + 5 * (1 - progress));
                    const targetY = sinA * (chargeRadius + 5 * (1 - progress));
                    
                    // 横方向のブレ
                    const perpX = -sinA;
                    const perpY = cosA;
                    const jitter = (Math.random() - 0.5) * 20;
                    
                    ctx.lineTo(targetX + perpX * jitter, targetY + perpY * jitter);
                }
                ctx.stroke();
            }
            
            ctx.restore();
        }

        // リング描画（質量増加・反転・奪取）：透明化中も表示するため不透明度を上書き
        if (isCapturing || isInverted || isPowered) {
            ctx.save();
            ctx.globalAlpha = 1.0;
            const auraPulse = (Math.sin(Date.now() / 100) + 1) / 2;

            const activeEffects = [];
            // 優先順位: 外側から 質量増加(Mass) -> 反転(Invert) -> 奪取(Capture)
            // 描画ループで半径を広げていくため、リストには「内側 -> 外側」の順で追加する
            // つまり: Capture -> Invert -> Mass
            if (isCapturing) activeEffects.push({ color: COLOR_ITEM_CAPTURE, glow: 10 });
            if (isInverted) activeEffects.push({ color: COLOR_ITEM_INVERSION, glow: 10 });
            if (isPowered) activeEffects.push({ color: COLOR_ITEM_MASS, glow: 15 });

            const effectCount = activeEffects.length;

            activeEffects.forEach((effect, index) => {
                let rBase = 1.5;
                let widthBase = 4.0;

                if (effectCount === 1) {
                    rBase = 1.6;
                    widthBase = 4.0;
                } else if (effectCount === 2) {
                    rBase = 1.5 + (index * 0.5); // 1.5, 2.0
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
            ctx.restore();
        }

        if (this.stealthOpacity > 0) {
            ctx.shadowBlur = (isPowered ? 40 : (this.isSatellite ? 15 : 30)) * blurFactor;
            ctx.shadowColor = this.color; ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, isPowered ? this.radius * 1.2 : this.radius, 0, Math.PI * 2); ctx.fill();

            ctx.shadowBlur = 0; ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, (isPowered ? this.radius * 1.2 : this.radius) * 0.4, 0, Math.PI * 2); ctx.fill();
        }

        // ラムジェットの燃焼発光（赤みがかった白）：透明化中も表示するため不透明度を上書き
        if (this.ramjetFlash > 0) {
            const intensity = this.ramjetFlash;
            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(255, 180, 150, ${intensity})`;
            ctx.shadowColor = `rgba(255, 180, 150, ${intensity})`;
            ctx.shadowBlur = 30 * blurFactor;
            ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, isPowered ? this.radius * 1.2 : this.radius, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        ctx.restore(); // 本体描画終了、不透明度設定リセット

        // ラベル描画：透明度の影響を受けない（特にプレイヤー）
        // 修正: 軌斥(repulsiveTrailTimer > 0)の場合も表示対象に追加
        if (this.isPlayer || ((isPowered || isInverted || isCapturing || this.repulsiveTrailTimer > 0 || this.isRamjetActive()) && this.stealthOpacity > 0.5)) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            const fontSize = Math.round(LABEL_PHYSICAL_FONT_SIZE / scaleFactor);
            ctx.font = `${fontSize * 0.9}px font-fugaz`; ctx.textAlign = 'center';
            let label = this.isPlayer ? "YOU" : "ENEMY";
            if (isPowered) label = "HEAVY";
            if (isInverted) label = "REPULS";
            if (this.repulsiveTrailTimer > 0) label = "TRAIL";
            if (isCapturing) label = "CAPTURE";
            if (this.isRamjetActive()) label = "RAMJET";

            let label_dist = 20;
            if (isPowered) label_dist += 4;
            if (isInverted) label_dist += 4;
            if (this.repulsiveTrailTimer > 0) label_dist += 4;
            if (isCapturing) label_dist += 4;
            if (this.isRamjetActive()) label_dist += 4;
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
            if (this.ramjetTimer > 0) effects.push({ ratio: this.ramjetTimer / RAMJET_DURATION, color: COLOR_ITEM_RAMJET_FRONT });

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
