import { Vector2 } from '../Vector2';

export class VisualWave {
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
        
        ctx.restore();
    }
}
