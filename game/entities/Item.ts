import { Vector2 } from '../Vector2';
import { ItemType } from '../../types';
import {
    COLOR_ITEM_MASS, COLOR_ITEM_SATELLITE, COLOR_ITEM_STEALTH, COLOR_ITEM_WAVE,
    COLOR_ITEM_INVERSION, COLOR_ITEM_REPULSIVE, COLOR_ITEM_CAPTURE, 
    COLOR_ITEM_RAMJET_FRONT, COLOR_ITEM_RAMJET_REAR, ITEM_RADIUS
} from '../../constants/gameConfig';

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
        else if (this.type === ItemType.RAMJET) color = COLOR_ITEM_RAMJET_FRONT;
        
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
        } else if (this.type === ItemType.RAMJET) {
            // 前方（青）：吸い込み口（広く取り込む）
            ctx.fillStyle = COLOR_ITEM_RAMJET_FRONT;
            ctx.beginPath();
            ctx.moveTo(-size * 0.8, -size * 0.8);
            ctx.lineTo(size * 0.8, -size * 0.8);
            ctx.lineTo(size * 0.2, -size * 0.1);
            ctx.lineTo(-size * 0.2, -size * 0.1);
            ctx.closePath();
            ctx.fill();

            // 後方（赤）：噴射口（鋭く噴射）
            ctx.fillStyle = COLOR_ITEM_RAMJET_REAR;
            ctx.beginPath();
            ctx.moveTo(-size * 0.4, size * 0.1);
            ctx.lineTo(size * 0.4, size * 0.1);
            ctx.lineTo(0, size * 1.0);
            ctx.closePath();
            ctx.fill();

            // コア（中央のエネルギー）
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.3);
            ctx.lineTo(size * 0.3, 0);
            ctx.lineTo(0, size * 0.3);
            ctx.lineTo(-size * 0.3, 0);
            ctx.closePath();
            ctx.fill();

            // 枠線用の全体シルエットパス
            ctx.beginPath();
            ctx.moveTo(-size * 0.8, -size * 0.8);
            ctx.lineTo(size * 0.8, -size * 0.8);
            ctx.lineTo(size * 0.4, 0);
            ctx.lineTo(0, size * 1.0);
            ctx.lineTo(-size * 0.4, 0);
            
            ctx.fillStyle = color; // Restore for stroke
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
        if (this.type !== ItemType.CAPTURE && this.type !== ItemType.RAMJET) ctx.fill(); 
        
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2 / scaleFactor; ctx.stroke();
        ctx.restore();
    }
}
