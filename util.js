export const createEmpty = _ => {
    return Array.from({ length: 64 }, _ => Array.from({ length: 64 }, _ => [0, 0, 0, 0]))
}

export const clearCanvas = (ctx) => {
    let imageData = ctx.createImageData(64, 64)
    for (let i = 0; i < 64 * 64; i++) imageData.data[i * 4 + 3] = 0
    ctx.putImageData(imageData, 0, 0)
}

export const applyColor = async (url, color) => {
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
        data[i] *= color[0] / 0xFF
        data[i + 1] *= color[1] / 0xFF
        data[i + 2] *= color[2] / 0xFF
        data[i + 3] *= color[3] / 0xFF
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png')
}

export const drawImage = async (ctxes, url, color) => {
    let img = new Image(64, 64)
    img.src = await applyColor(url, color)
    await new Promise((resolve, _) => img.onload = _ => resolve())
    ctxes.forEach(ctx => ctx.drawImage(img, 0, 0))
}
export const setPoint = (data, x, y, color) => {
    let index = (y * 64 + x) * 4
    data.data[index] = color[0]   // R
    data.data[index + 1] = color[1]  // G
    data.data[index + 2] = color[2]  // B
    data.data[index + 3] = color[3]  // 不透明
}

export const interpolateColor = (color1, color2, t) => {
    t = Math.min(Math.max(t, 0), 1)
    let r = Math.round(color1[0] + (color2[0] - color1[0]) * t)
    let g = Math.round(color1[1] + (color2[1] - color1[1]) * t)
    let b = Math.round(color1[2] + (color2[2] - color1[2]) * t)
    let a = Math.round(color1[3] + (color2[3] - color1[3]) * t)
    return [r, g, b, a]
}

export const fill = (data, source, allow = _ => true, color) => {
    fillRange(data, source, 0, 0, 63, 63, allow, color)
}

export const fillRange = (data, source, minX, minY, maxX, maxY, allow = _ => true, color) => {
    for (let i = minX; i <= maxX; i++)
        for (let j = minY; j <= maxY; j++)
            if (source[i][j][3] && allow(i, j))
                setPoint(data, i, j, color ? color : source[i][j])
}

export const smooth = (colorMap, minX, minY, maxX, maxY) => {
    for (let i = minX; i < maxX; i++)
        for (let j = minY; j < maxY; j++) {
            if (isAlone(colorMap, i, j))
                colorMap[i][j] = [0, 0, 0, 0]
            else if (isHole(colorMap, i, j))
                colorMap[i][j] = average(colorMap, i, j)
        }
}

const isAlone = (colorMap, i, j) => {
    if (colorMap[i + 1]?.[j]?.[3] ?? 0) return false
    if (colorMap[i - 1]?.[j]?.[3] ?? 0) return false
    if (colorMap[i]?.[j + 1]?.[3] ?? 0) return false
    if (colorMap[i]?.[j - 1]?.[3] ?? 0) return false
    return true
}

const isHole = (colorMap, i, j) => {
    if (!(colorMap[i + 1]?.[j]?.[3] ?? 0)) return false
    if (!(colorMap[i - 1]?.[j]?.[3] ?? 0)) return false
    if (!(colorMap[i]?.[j + 1]?.[3] ?? 0)) return false
    if (!(colorMap[i]?.[j - 1]?.[3] ?? 0)) return false
    return true
}

const average = (colorMap, i, j) => {
    let a = colorMap[i + 1][j] ?? [0, 0, 0, 0], b = colorMap[i - 1][j] ?? [0, 0, 0, 0], c = colorMap[i][j + 1] ?? [0, 0, 0, 0], d = colorMap[i][j - 1] ?? [0, 0, 0, 0]
    let cnt = (a == null ? 0 : 1) + (b == null ? 0 : 1) + (c == null ? 0 : 1) + (d == null ? 0 : 1)
    return [(a[0] + b[0] + c[0] + d[0]) / cnt, (a[1] + b[1] + c[1] + d[1]) / cnt, (a[2] + b[2] + c[2] + d[2]) / cnt, (a[3] + b[3] + c[3] + d[3]) / cnt]
}

export const parseColorString = (c1) => [parseInt(c1.substring(1, 3), 16), parseInt(c1.substring(3, 5), 16), parseInt(c1.substring(5, 7), 16), 0xFF]

export const downloadCanvas = canvas => {
    let filename = Date.now() + '.png'
    let imgdata = canvas.toDataURL()
    let link = document.createElement('a')
    link.href = imgdata
    link.download = filename
    let event = document.createEvent('MouseEvents')
    event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    link.dispatchEvent(event)
}

window.saveCanvas = canvas => downloadCanvas(canvas)