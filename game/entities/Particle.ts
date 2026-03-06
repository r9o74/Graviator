import { Vector2 } from '../Vector2';
import { COLOR_PARTICLE, PARTICLE_PHYSICAL_RADIUS } from '../../constants/gameConfig';

export class Particle {
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
