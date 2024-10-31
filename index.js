//Copyright @IAFEnvoy, All Right Reserved
import { SkinViewer, WalkingAnimation } from 'skinview3d'

let skinViewer
window.onload = async _ => {
    randomSeed()
    skinViewer = new SkinViewer({
        canvas: document.getElementById("skin_container"),
        width: 480,
        height: 480
    })
    skinViewer.zoom = 0.8
    skinViewer.animation = new WalkingAnimation()
    skinViewer.animation.speed = 1
    await reloadSkin()
}

const getAge = () => {
    for (let i = 1; i <= 5; i++)
        if (document.getElementById(`age_${i}`).checked)
            return i
    return 1
}

const parseColorString = (c1) => [parseInt(c1.substring(1, 3), 16), parseInt(c1.substring(3, 5), 16), parseInt(c1.substring(5, 7), 16), 0xFF]

const getColor = () => {
    if (document.getElementById(`voltaris`).checked) return [0xFF, 0, 0, 0xFF]
    if (document.getElementById(`sendaris`).checked) return [0, 0, 0xFF, 0xFF]
    if (document.getElementById(`mendoris`).checked) return [0xA0, 0x20, 0xF0, 0xFF]
    if (document.getElementById(`nestoris`).checked) return [0xFF, 0xFF, 0, 0xFF]
    if (document.getElementById(`kaltaris`).checked) return [0, 0xFF, 0, 0xFF]
    return parseColorString(document.getElementById(`marker_color`).value)
}

const reloadSkin = window.reloadSkin = async () => {
    skinViewer.loadSkin(await generateSkin(getColor(), getAge(), document.getElementById('female').checked, +document.getElementById('seed').value))
}

const randomSeed = window.randomSeed = () => document.getElementById('seed').value = Math.floor(Math.random() * Math.pow(2, 50))

const generateSkin = async (color, age, female, seed) => {
    if (age < 1 || age > 5) throw 'age must in 1~5!'
    let generateCanvas = document.getElementById('generate')
    let markerCanvas = document.getElementById('marker')
    let skinCanvas = document.getElementById('skin')
    let generateCtx = generateCanvas.getContext('2d')
    let markerCtx = markerCanvas.getContext('2d')
    let skinCtx = skinCanvas.getContext('2d')
    //Clear
    clearCanvas(generateCtx)
    clearCanvas(markerCtx)
    clearCanvas(skinCtx)
    //Draw
    await drawImage([skinCtx], './img/ardoni_base.png')
    await drawImage([skinCtx, generateCtx, markerCtx], new ArdoniMarkerGenerator(seed).generate(), color)
    await drawImage([skinCtx], `./img/ardoni_eye_${female ? 'female' : 'male'}.png`)
    await drawImage([skinCtx, markerCtx], `./img/ardoni_pupil_${female ? 'female' : 'male'}.png`, color)
    await drawImage([skinCtx], `./img/ardoni_hair_${age}.png`)
    await drawImage([skinCtx, markerCtx], `./img/ardoni_hair_${age}_marker.png`, color)
    if (female)
        await drawImage([skinCtx, markerCtx], `./img/ardoni_hair_female_extra.png`, color)
    let image = new Image(64, 64)
    image.src = skinCanvas.toDataURL("image/png")
    return image
}

const clearCanvas = (ctx) => {
    let imageData = ctx.createImageData(64, 64)
    for (let i = 0; i < 640 * 640; i++) imageData.data[i * 4 + 3] = 0
    ctx.putImageData(imageData, 0, 0)
}

const applyColor = async (url, color) => {
    if (!color) return url
    let img = new Image(64, 64)
    img.src = url
    await new Promise((resolve, _) => img.onload = _ => resolve())
    let canvas = document.createElement('canvas')
    let ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    let imageData = ctx.getImageData(0, 0, 64, 64)
    let data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 10) continue
        let c = colorBlend([data[i], data[i + 1], data[i + 2], data[i + 3]], color, 0.7)
        data[i] = c[0]
        data[i + 1] = c[1]
        data[i + 2] = c[2]
        data[i + 3] = c[3]
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png')
}

const drawImage = async (ctxes, url, color) => {
    let img = new Image(64, 64)
    img.src = await applyColor(url, color)
    await new Promise((resolve, _) => img.onload = _ => resolve())
    ctxes.forEach(ctx => ctx.drawImage(img, 0, 0))
}

const BODY_OFFSET_X = 0, BODY_OFFSET_Y = 20
const LEGS_OFFSET_X = 16, LEGS_OFFSET_Y = 52
class ArdoniMarkerGenerator {
    constructor(seed) {
        this.present = false
        this.random = new SeededRandom(seed)
        this.body = new ArdoniLikeBooleanMapGenerator(56, 12, this.random.nextLong())
        this.legs = new ArdoniLikeBooleanMapGenerator(32, 12, this.random.nextLong())
        this.canvas = document.createElement('canvas')
        this.ctx = this.canvas.getContext('2d')
        this.imageData = this.ctx.createImageData(64, 64)
    }
    generateColor() {
        let r = this.random.nextInt(0xC0, 0x100)
        return [r, r, r, 0xFF]
    }
    setPoint(x, y, color) {
        let index = (y * 64 + x) * 4
        this.imageData.data[index] = color[0]   // R
        this.imageData.data[index + 1] = color[1]  // G
        this.imageData.data[index + 2] = color[2]  // B
        this.imageData.data[index + 3] = color[3]  // 不透明
    }
    fill(offsetX, offsetY, map) {
        for (let i = 0; i < map.length; i++)
            for (let j = 0; j < map[i].length; j++)
                if (map[i][j]) this.setPoint(offsetX + i, offsetY + j, this.generateColor())
                else this.setPoint(offsetX + i, offsetY + j, [0, 0, 0, 0])
    }
    generate() {
        if (!this.present) {
            this.present = true
            for (let i = 0; i < 64 * 64; i++)
                this.imageData.data[i * 4 + 3] = 0 // 透明度
            this.fill(BODY_OFFSET_X, BODY_OFFSET_Y, this.body.generate())
            this.fill(LEGS_OFFSET_X, LEGS_OFFSET_Y, this.legs.generate())
            this.ctx.putImageData(this.imageData, 0, 0)
        }
        return this.canvas.toDataURL("image/png")
    }
}

const dirX = [1, 1, 0, -1, -1, -1, 0, 1]
const dirY = [0, 1, 1, 1, 0, -1, -1, -1]
const inRange = (g, x, y) => x >= 0 && y >= 0 && x < g.width && y < g.height
const checkOrTrue = (g, x, y, fn) => !inRange(g, x, y) || fn(x, y)
const checkOrFalse = (g, x, y, fn) => inRange(g, x, y) && fn(x, y)
const allow = (g, map, x, y, igDir) => inRange(g, x, y) && !map[x][y] && Array.from({ length: 8 }, (_, k) => k).reduce((p, c) => p && (c == igDir || c == (igDir + 1) % 8 || c == (igDir + 7) % 8 || checkOrTrue(g, x + dirX[c], y + dirY[c], (_x, _y) => !map[_x][_y])), true)
const allowMap = (g, map, x, y) => Array.from({ length: 8 }, (_, k) => k * 2).filter(i => checkOrFalse(g, x + dirX[i], y + dirY[i], (_x, _y) => allow(g, map, _x, _y, (i + 4) % 8)))

class ArdoniLikeBooleanMapGenerator {
    constructor(width, height, seed) {
        this.width = width
        this.height = height
        this.random = new SeededRandom(seed)
        this.flag = Math.floor(Math.pow(width * height, 0.5))
    }

    generate() {
        let data = Array.from({ length: this.width }, _ => Array.from({ length: this.height }, _ => false))
        let count = this.random.nextInt(this.flag / 2, this.flag)
        let queue = []
        for (let i = 0; i < count; i++) {
            let x = this.random.nextInt(0, this.width), y = this.random.nextInt(0, this.height)
            let size = this.random.nextInt(this.flag, this.width * this.height), dir = -1
            queue.push({ x: x, y: y, size: size, dir: dir })
        }
        while (queue.length > 0) {
            let o = queue.shift()
            if (o.size <= 0 || !allow(this, data, o.x, o.y, o.dir))
                continue
            data[o.x][o.y] = true
            for (let i of allowMap(this, data, o.x, o.y))
                if (this.random.nextInt(0, 1) == 0)
                    queue.push({
                        x: o.x + dirX[i],
                        y: o.y + dirY[i],
                        size: this.random.nextInt(Math.floor(o.size * 2 / 3), o.size),
                        dir: (i + 4) % 8
                    })
        }
        return data
    }
}

class SeededRandom {
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

const colorBlend = (c1, c2, ratio) => {
    ratio = Math.max(Math.min(Number(ratio), 1), 0)
    let r = Math.round(c1[0] * (1 - ratio) + c2[0] * ratio)
    let g = Math.round(c1[1] * (1 - ratio) + c2[1] * ratio)
    let b = Math.round(c1[2] * (1 - ratio) + c2[2] * ratio)
    let a = Math.round(c1[3] * (1 - ratio) + c2[3] * ratio)
    return [r, g, b, a]
}