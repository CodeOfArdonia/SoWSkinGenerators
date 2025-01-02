export default class SeededRandom {
    constructor(seed) {
        this.seed = seed;
        this.modulus = 0xFFFFFFFF;
        this.multiplier = 0x5DEECE66D;
        this.increment = 0xB;
        this.current = this.seed;
    }

    random() {
        this.current = (this.current * this.multiplier + this.increment) % this.modulus;
        return this.current / this.modulus; // 返回 0 到 1 之间的数
    }

    nextLong() {
        return Math.floor(this.random() * Math.pow(2, 63))
    }

    nextInt(min, max) {
        return min + Math.floor(this.random() * (max - min + 1))
    }
}