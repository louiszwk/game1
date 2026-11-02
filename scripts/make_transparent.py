# -*- coding: utf-8 -*-
"""
将生成的 PNG 图片做处理：
1. 白底转透明（用 flood-fill 从四角扩散，去除纯白/近白背景）
2. 自动裁剪到内容包围盒，并加少量边距
3. 缩放到目标尺寸（保持透明通道）
"""
import os
from PIL import Image

# 目标尺寸（正方形，保持宽高比居中）
HERO_TARGET = 256
ENEMY_TARGET = 256

def remove_white_bg(img):
    """从四角 flood-fill 去除近白背景，转为透明"""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    # 收集背景种子色（四角平均）
    corners = [px[0, 0], px[w-1, 0], px[0, h-1], px[w-1, h-1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    # 判定是否为"近白"背景（亮度高、饱和度低）
    def is_bg(p):
        r, g, b, a = p
        mx = max(r, g, b)
        mn = min(r, g, b)
        return mx > 220 and (mx - mn) < 40

    # 如果四角不是近白，说明可能是透明或彩色背景，直接返回
    if not is_bg(px[0, 0]):
        return img

    from collections import deque
    visited = set()
    q = deque()
    for sx in range(w):
        for sy in (0, h-1):
            q.append((sx, sy))
    for sy in range(h):
        for sx in (0, w-1):
            q.append((sx, sy))

    while q:
        x, y = q.popleft()
        if (x, y) in visited:
            continue
        if x < 0 or x >= w or y < 0 or y >= h:
            continue
        p = px[x, y]
        if not is_bg(p):
            continue
        visited.add((x, y))
        px[x, y] = (255, 255, 255, 0)  # 设为透明
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            q.append((x+dx, y+dy))

    return img

def autocrop(img, pad=8):
    """裁剪到非透明内容包围盒"""
    bbox = img.getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(img.size[0], r + pad)
    b = min(img.size[1], b + pad)
    return img.crop((l, t, r, b))

def fit_square(img, size):
    """等比缩放并居中到 size x size 透明画布"""
    img.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - img.size[0]) // 2
    oy = (size - img.size[1]) // 2
    canvas.paste(img, (ox, oy), img)
    return canvas

def process(path, target):
    img = Image.open(path)
    img = remove_white_bg(img)
    img = autocrop(img)
    img = fit_square(img, target)
    img.save(path)
    print(f"处理完成: {path} -> {img.size}")

if __name__ == "__main__":
    # 动物主角
    hero_dir = "D:/file/wr/images/heroes"
    for name in ["chicken", "duck", "cow", "sheep", "fish"]:
        base = os.path.join(hero_dir, f"{name}.png")
        process(base, HERO_TARGET)
        for s in [1, 2, 3]:
            st = os.path.join(hero_dir, f"{name}_stage{s}.png")
            process(st, HERO_TARGET)

    # 外星敌人
    enemy_dir = "D:/file/wr/images/enemies"
    for name in ["swarmer", "trooper", "acid_spitter", "ufo_scout", "behemoth", "boss"]:
        process(os.path.join(enemy_dir, f"{name}.png"), ENEMY_TARGET)
