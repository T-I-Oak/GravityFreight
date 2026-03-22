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
    const minDist = 10;
    if (distSq < minDist * minDist) return new Vector2();
    const forceMagnitude = (G * mass1 * mass2) / distSq;
    return diff.normalize().scale(forceMagnitude);
}

/**
 * 点と線分の最短距離の2乗を計算する (CCD用)
 * @param {Vector2} p 点
 * @param {Vector2} a 線分の端点1
 * @param {Vector2} b 線分の端点2
 * @returns {number} 距離の2乗
 */
export function getDistanceSqToSegment(p, a, b) {
    const ab = b.sub(a);
    const ap = p.sub(a);
    const lengthSq = ab.lengthSq();
    if (lengthSq === 0) return ap.lengthSq();
    
    // 線分上の投影位置 t を計算 (0.0 - 1.0 にクランプ)
    let t = (ap.x * ab.x + ap.y * ab.y) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    
    const closest = a.add(ab.scale(t));
    return p.sub(closest).lengthSq();
}


/**
 * 指定した位置における重力加速度の合計を計算する
 * @param {Vector2} pos 計算対象の位置
 * @param {Array} bodies 重力源となる物体の配列
 * @param {number} targetMass 加速度を計算する対象の物体の質量（基準質量10との比でスケール）
 * @param {Body} excludeBody 計算から除外する物体（自身の重力無視用）
 * @returns {Vector2} 加速度ベクトル
 */
export function calculateAcceleration(pos, bodies, targetMass = 10, excludeBody = null) {
    let totalAcc = new Vector2();
    const referenceMass = 10; // 基準質量 (Core Hull)
    // 重力の影響は質量に反比例させる（軽量機体ほど強くなる）
    const massFactor = referenceMass / targetMass;



    for (const other of bodies) {
        if (other === excludeBody) continue;
        const diff = other.position.sub(pos);
        const distSq = diff.lengthSq();
        const minDist = 10;
        if (distSq < minDist * minDist) continue;

        // 加速度 a = G * M / r^2
        // さらにこのゲーム固有の仕様として、船体質量による補正 (massFactor) を掛ける
        const accMagnitude = ((G * other.mass) / distSq) * massFactor;
        totalAcc = totalAcc.add(diff.normalize().scale(accMagnitude));
    }
    return totalAcc;
}

export class PhysicsEngine {

    constructor() {
        this.bodies = [];
    }

    update(dt) {
        for (let i = 0; i < this.bodies.length; i++) {
            const body = this.bodies[i];
            if (body.isStatic) continue;

            // 自機の質量を考慮して加速度を計算
            const acceleration = calculateAcceleration(body.position, this.bodies, body.mass, body);
            
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
        this.radius = Math.sqrt(mass) / 5 + 2;
        this.items = [];
        this.isCollected = false;
    }
}
