import { Vector2 } from '../Vector2';
import { Entity } from '../entities/Entity';
import { WAVE_SPEED, WAVE_MAX_RADIUS, WAVE_FORCE_GRAVITY_MULTIPLIER, WAVE_DURATION } from '../../constants/gameConfig';

// 重力波クラス（物理影響あり）
export class GravityWave {
    origin: Vector2;
    radius: number = 0;
    owner: Entity;
    hitEntities: Set<Entity> = new Set(); // 既にヒットしたエンティティを記録
    life: number = 1.0;
    waveForceBase: number;

    constructor(x: number, y: number, owner: Entity, gravityConstant: number) {
        this.origin = new Vector2(x, y);
        this.owner = owner;
        // 現在の難易度のgravityConstantに連動した力の基準値
        this.waveForceBase = gravityConstant * WAVE_FORCE_GRAVITY_MULTIPLIER;
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
                
                // 距離減衰とライフ減衰を考慮した力
                // 遠くてもある程度効くように調整
                let forceMagnitude = this.waveForceBase * decay;

                // 反転アイテム効果中の場合は重力波の力を反転（引き寄せる）
                if (entity.isInversionActive()) {
                    forceMagnitude *= -1;
                }

                // 重力波を受けたエンティティに力を設定（Entity側で処理）
                entity.waveForce = new Vector2(dir.x * forceMagnitude, dir.y * forceMagnitude);
                entity.waveForceTimer = WAVE_DURATION; // ノックバック時間

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
