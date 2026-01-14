// 2次元ベクトルを扱うクラス
// 位置、速度、加速度、力の計算などに使用されます
export class Vector2 {
    constructor(public x: number = 0, public y: number = 0) {}

    // 加算
    add(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    // 減算
    subtract(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    // スカラー倍（大きさの変更）
    scale(scalar: number): Vector2 {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    // ベクトルの長さ（大きさ）を取得
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    // ベクトルの長さの二乗を取得（比較や距離計算の高速化に使用）
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    // 正規化（長さを1にした単位ベクトルを返す）
    normalize(): Vector2 {
        const len = this.length();
        if (len === 0) return new Vector2();
        return new Vector2(this.x / len, this.y / len);
    }

    // 内積
    dot(other: Vector2): number {
        return this.x * other.x + this.y * other.y;
    }
    
    // 複製
    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    // 2点間の距離を計算する静的メソッド
    static distance(a: Vector2, b: Vector2): number {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }
}