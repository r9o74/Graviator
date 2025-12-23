export class Vector2 {
    constructor(public x: number = 0, public y: number = 0) {}

    add(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    subtract(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    scale(scalar: number): Vector2 {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    normalize(): Vector2 {
        const len = this.length();
        if (len === 0) return new Vector2();
        return new Vector2(this.x / len, this.y / len);
    }

    dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y;
    }
    
    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    static distance(a: Vector2, b: Vector2): number {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }
}