//Copyright @IAFEnvoy, All Right Reserved
import Ground2D from './PerlinNoise'
import { interpolateColor, smooth, fill, createEmpty, parseColorString, setPoint } from './util'

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

const randomSeed = window.randomSeed = () => {
    document.getElementById('seed').value = Math.floor(Math.random() * Math.pow(2, 50))
    reloadSkin()
}

const generateSkin = window.generateSkin = async (seed, eyeColor, blockSize) => {
    let skinCanvas = document.getElementById('skin')
    let skinCtx = skinCanvas.getContext('2d')
    let markerCanvas = document.getElementById('marker')
    let markerCtx = markerCanvas.getContext('2d')
    let skinData = skinCtx.createImageData(64, 64)
    let markerData = markerCtx.createImageData(64, 64)

    let lavaMap = generateColors(seed, 0.2, [
        { diff: 8, loud: 0.5 },
        { diff: 5, loud: 0.25 },
        { diff: 3, loud: 0.125 },
        { diff: 1, loud: 0.0625 },
    ], h => interpolateColor([0xff, 0x45, 0x00, 0xff], [0xff, 0xff, 0x00, 0xff], h))
    fill(skinData, lavaMap, inFirstLayer)
    fill(markerData, lavaMap, inFirstLayer)

    let carveColor = generateColors(seed + 1, 0, [
        { diff: 1, loud: 0.75 },
        { diff: 0.5, loud: 0.5 },
        { diff: 0.25, loud: 0.25 },
    ], h => interpolateColor([0x72, 0x5f, 0x52, 0xff], [0x1c, 0x15, 0x12, 0xff], h))
    let carve = generateColors(seed + 2, blockSize, [
        { diff: 2, loud: 1.5 },
        { diff: 1.5, loud: 1.5 },
        { diff: 0.5, loud: 0.5 },
    ], h => h > 0 ? [0xff, 0xff, 0xff, 0xff] : [0, 0, 0, 0])
    let firstLayer = createEmpty(), secondLayer = createEmpty()
    resolveCarve(carveColor, carve, firstLayer, secondLayer)
    fill(skinData, firstLayer, inFirstLayer)
    fill(markerData, firstLayer, inFirstLayer, [0, 0, 0, 0])
    fill(skinData, secondLayer, inSecondLayer)
    fill(skinData, carveColor, isFirstFace)
    fill(markerData, carveColor, isFirstFace, [0, 0, 0, 0])
    setPoint(skinData, 9, 11, [0x30, 0x27, 0x1F, 0xFF])
    setPoint(skinData, 14, 11, [0x30, 0x27, 0x1F, 0xFF])
    setPoint(skinData, 10, 11, eyeColor)
    setPoint(skinData, 13, 11, eyeColor)

    skinCtx.putImageData(skinData, 0, 0)
    markerCtx.putImageData(markerData, 0, 0)
    let image = new Image(64, 64)
    image.src = skinCanvas.toDataURL("image/png")
    return image
}

let lastGenTime = 0
const reloadSkin = window.reloadSkin = async () => {
    let beginTime = +new Date()
    if (beginTime - lastGenTime < 50) return
    skinViewer.loadSkin(await generateSkin(+document.getElementById('seed').value, parseColorString(document.getElementById(`eye_color`).value), +document.getElementById('block_size').value))
    let endTime = lastGenTime = +new Date()
    document.getElementById('time').innerHTML = `Generate Time: ${endTime - beginTime}ms`
}

window.onBlockSizeChange = () => {
    let i = document.getElementById('block_size')
    i.value = Math.floor(i.value * 100) / 100
    document.getElementById('block_size_value').innerHTML = i.value
    reloadSkin()
}

const generatePerlin = (seed, base, config) => {
    let ground = new Ground2D(seed, base, config)
    let perlin = createEmpty()
    for (let i = 0; i < 64; i++)
        for (let j = 0; j < 64; j++)
            perlin[i][j] = ground.getHeight(i, j)
    return perlin
}

//这里会自动去除噪点，防止太多单像素点太丑
const generateColors = (seed, base, config, colorLoader) => {
    let colorMap = generatePerlin(seed, base, config)
    for (let i = 0; i < 64; i++)
        for (let j = 0; j < 64; j++)
            colorMap[i][j] = colorLoader(colorMap[i][j])
    smooth(colorMap, 0, 0, 64, 64)
    return colorMap
}

//xyxy
const layerMapping = [
    [[8, 0, 15, 7], [40, 0, 55, 7]],
    [[0, 8, 31, 15], [32, 8, 63, 15]],
    [[4, 16, 11, 19], [4, 32, 11, 35]],
    [[20, 16, 35, 19], [20, 32, 35, 35]],
    [[44, 16, 51, 19], [44, 32, 51, 35]],
    [[0, 20, 55, 31], [0, 36, 55, 47]],
    [[20, 48, 27, 51], [4, 48, 11, 51]],
    [[36, 48, 43, 51], [52, 48, 59, 51]],
    [[16, 52, 31, 63], [0, 52, 15, 63]],
    [[32, 52, 47, 63], [48, 52, 63, 63]],
]

const inFirstLayer = (i, j) => {
    if (isFirstFace(i, j)) return false
    for (let a of layerMapping)
        if (a[0][0] <= i && i <= a[0][2] && a[0][1] <= j && j <= a[0][3])
            return true
    return false
}

const inSecondLayer = (i, j) => {
    if (isSecondFace(i, j)) return false
    for (let a of layerMapping)
        if (a[1][0] <= i && i <= a[1][2] && a[1][1] <= j && j <= a[1][3])
            return true
    return false
}

const isFirstFace = (i, j) =>
    8 <= i && i <= 15 && 9 <= j && j <= 12 ||
    10 <= i && i <= 13 && 13 <= j && j <= 15
const isSecondFace = (i, j) =>
    41 <= i && i <= 42 && 10 <= j && j <= 12 ||
    45 <= i && i <= 46 && 10 <= j && j <= 12

const resolveCarve = (carveColor, carve, firstLayer, secondLayer) => {
    for (let [a, b] of layerMapping)
        for (let i = a[0]; i <= a[2]; i++)
            for (let j = a[1]; j <= a[3]; j++)
                if (carve[i][j][3]) firstLayer[i][j] = carveColor[i][j]
                else secondLayer[i - a[0] + b[0]][j - a[1] + b[1]] = carveColor[i][j]
}