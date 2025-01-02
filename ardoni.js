//Copyright @IAFEnvoy, All Right Reserved
import SeededRandom from './SeededRandom'
import { clearCanvas, applyColor, drawImage, setPoint, parseColorString } from './util'

let skinViewer, availableAnimations
window.onload = _ => {
    import('skinview3d').then(async skinview3d => {
        availableAnimations = {
            idle: new skinview3d.IdleAnimation(),
            walk: new skinview3d.WalkingAnimation(),
            run: new skinview3d.RunningAnimation(),
            fly: new skinview3d.FlyingAnimation(),
            wave: new skinview3d.WaveAnimation(),
        };
        skinViewer = new skinview3d.SkinViewer({
            canvas: document.getElementById("skin_container"),
            width: 480,
            height: 480
        })
        skinViewer.zoom = 0.8
        setAnimation()
        skinViewer.animation.speed = 1
        randomSeed()
    })
}

const setAnimation = window.setAnimation = () => {
    for (let n of Object.keys(availableAnimations))
        if (document.getElementById(n).checked) {
            skinViewer.animation = availableAnimations[n]
            return
        }
}

const getAge = () => {
    for (let i = 1; i <= 5; i++)
        if (document.getElementById(`age_${i}`).checked)
            return i
    return 1
}

const getColor = () => {
    if (document.getElementById(`voltaris`).checked) return [0xFF, 0, 0, 0xFF]
    if (document.getElementById(`sendaris`).checked) return [0, 0, 0xFF, 0xFF]
    if (document.getElementById(`mendoris`).checked) return [0xA0, 0x20, 0xF0, 0xFF]
    if (document.getElementById(`nestoris`).checked) return [0xFF, 0xFF, 0, 0xFF]
    if (document.getElementById(`kaltaris`).checked) return [0, 0xFF, 0, 0xFF]
    return parseColorString(document.getElementById(`marker_color`).value)
}

window.onDarknessChange = () => {
    let i = document.getElementById('darkness')
    i.value = Math.floor(i.value * 100) / 100
    document.getElementById('darkness_value').innerHTML = i.value
    reloadSkin()
}

let lastGenTime = 0
const reloadSkin = window.reloadSkin = async () => {
    let beginTime = +new Date()
    if (beginTime - lastGenTime < 50) return
    let darkness = document.getElementById('darkness').value * 0xFF
    skinViewer.loadSkin(await generateSkin([darkness, darkness, darkness, 0xFF], getColor(), +document.getElementById('seed').value, getAge(), document.getElementById('female').checked, document.getElementById('shadow').checked))
    let endTime = lastGenTime = +new Date()
    document.getElementById('time').innerHTML = `Generate Time: ${endTime - beginTime}ms`
}

const randomSeed = window.randomSeed = () => {
    document.getElementById('seed').value = Math.floor(Math.random() * Math.pow(2, 50))
    reloadSkin()
}

const generateSkin = async (skinColor, markerColor, seed, age, female, shadow) => {
    if (age < 1 || age > 5) throw 'age must in 1~5!'
    let generateCanvas = document.getElementById('generate')
    let markerCanvas = document.getElementById('marker')
    let skinNoEyeCanvas = document.getElementById('skin-no-eye')
    let skinCanvas = document.getElementById('skin')
    let generateCtx = generateCanvas.getContext('2d')
    let markerCtx = markerCanvas.getContext('2d')
    let skinNoEyeCtx = skinNoEyeCanvas.getContext('2d')
    let skinCtx = skinCanvas.getContext('2d')
    console.log(skinColor, markerColor, seed, age, female, shadow)
    //Clear
    clearCanvas(generateCtx)
    clearCanvas(markerCtx)
    clearCanvas(skinNoEyeCtx)
    clearCanvas(skinCtx)
    //Draw
    await drawImage([skinCtx, skinNoEyeCtx], './img/ardoni_base.png', skinColor)
    if (shadow)
        await drawImage([skinCtx, markerCtx, skinNoEyeCtx], `./img/ardoni_shadow.png`, skinColor)
    await drawImage([skinCtx, generateCtx, markerCtx, skinNoEyeCtx], new ArdoniMarkerGenerator(seed).generate(), markerColor)
    await drawImage([skinCtx], `./img/ardoni_eye_${female ? 'female' : 'male'}.png`, skinColor)
    await drawImage([skinCtx, markerCtx], `./img/ardoni_pupil_${female ? 'female' : 'male'}.png`, markerColor)
    await drawImage([skinCtx, skinNoEyeCtx], `./img/ardoni_hair_${age}.png`, skinColor)
    await drawImage([skinCtx, markerCtx, skinNoEyeCtx], `./img/ardoni_hair_${age}_marker.png`, markerColor)
    if (female)
        await drawImage([skinCtx, markerCtx, skinNoEyeCtx], `./img/ardoni_hair_female_extra.png`, markerColor)
    let image = new Image(64, 64)
    image.src = skinCanvas.toDataURL("image/png")
    return image
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
    fill(offsetX, offsetY, map) {
        for (let i = 0; i < map.length; i++)
            for (let j = 0; j < map[i].length; j++)
                if (map[i][j]) setPoint(this.imageData, offsetX + i, offsetY + j, this.generateColor())
                else setPoint(this.imageData, offsetX + i, offsetY + j, [0, 0, 0, 0])
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