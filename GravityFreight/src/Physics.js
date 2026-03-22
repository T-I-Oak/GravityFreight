export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }

    scale(s) {
        return new Vector2(this.x * s, this.y * s);
    }

    lengthSq() {
        return this.x * this.x + this.y * this.y;
    }

    length() {
        return Math.sqrt(this.lengthSq());
    }

    normalize() {
        const len = this.length();
        if (len === 0) return new Vector2();
        return this.scale(1 / len);
    }
}

export const G = 4000; // 星を増やしたためのバランス調整

/**
 * 逆二乗則に基づく重力を計算する
 * @param {Vector2} pos1 物体1の位置
 * @param {number} mass1 物体1の質量
 * @param {Vector2} pos2 物体2の位置
 * @param {number} mass2 物体2の質量
 * @returns {Vector2} 物体1にかかる重力ベクトル
 */
export function calculateGravity(pos1, mass1, pos2, mass2) {
    const diff = pos2.sub(pos1);
    const distSq = diff.lengthSq();
    
    // あまりに近すぎる場合は挙動を安定させるために最小距離を設定
    const minDist = 10;
    if (distSq < minDist * minDist) return new Vector2();

    const forceMagnitude = (G * mass1 * mass2) / distSq;
    return diff.normalize().scale(forceMagnitude);
}

export class PhysicsEngine {
    constructor() {
        this.bodies = [];
    }

    update(dt) {
        // 重力の計算
        for (let i = 0; i < this.bodies.length; i++) {
            const body = this.bodies[i];
            if (body.isStatic) continue;

            let totalForce = new Vector2();
            for (let j = 0; j < this.bodies.length; j++) {
                if (i === j) continue;
                const other = this.bodies[j];
                const force = calculateGravity(body.position, body.mass, other.position, other.mass);
                totalForce = totalForce.add(force);
            }

            // 加速度 a = F / m
            const acceleration = totalForce.scale(1 / body.mass);
            body.velocity = body.velocity.add(acceleration.scale(dt));
            body.position = body.position.add(body.velocity.scale(dt));
        }
    }
}

export class Body {
    constructor(position, mass, isStatic = false) {
        this.position = position;
        this.velocity = new Vector2();
        this.mass = mass;
        this.isStatic = isStatic;
    }
}
