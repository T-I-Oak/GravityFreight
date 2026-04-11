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

    dot(v) {
        return this.x * v.x + this.y * v.y;
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

export const G = 4000; // 以前の重力バランスに復帰 (事実ベース)


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
    // 重力の影響は質量に反比例させる（軽量ロケットほど強くなる）
    const massFactor = referenceMass / targetMass;



    for (const other of bodies) {
        if (other === excludeBody) continue;
        const diff = other.position.sub(pos);
        const distSq = diff.lengthSq();
        const minDist = 10;
        if (distSq < minDist * minDist) continue;

        // 加速度 a = G * M / r^2
        // さらにこのゲーム固有の仕様として、船体質量による補正 (massFactor) を掛ける
        const accMagnitude = ((G * other.mass) / distSq) * massFactor * other.gravityMultiplier;
        totalAcc = totalAcc.add(diff.normalize().scale(accMagnitude));
    }
    return totalAcc;
}


export class Body {
    constructor(position, mass, isStatic = false) {
        this.position = position;
        this.velocity = new Vector2();
        this.mass = mass;
        this.isStatic = isStatic;
        this.radius = Math.sqrt(mass) / 5 + 2;
        this.items = [];
        this.gravityMultiplier = 1.0; // 重力倍率 (1.0 = 通常, 負の値 = 斥力)
        this.isCollected = false;
    }
}
