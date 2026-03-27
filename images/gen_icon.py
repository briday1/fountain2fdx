import os
from PIL import Image, ImageDraw, ImageFont

SIZE = 128
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Rounded background
BG = (30, 32, 40, 255)
def rounded_rect(draw, xy, r, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0+r, y0, x1-r, y1], fill=fill)
    draw.rectangle([x0, y0+r, x1, y1-r], fill=fill)
    draw.ellipse([x0, y0, x0+2*r, y0+2*r], fill=fill)
    draw.ellipse([x1-2*r, y0, x1, y0+2*r], fill=fill)
    draw.ellipse([x0, y1-2*r, x0+2*r, y1], fill=fill)
    draw.ellipse([x1-2*r, y1-2*r, x1, y1], fill=fill)

rounded_rect(d, (0, 0, 127, 127), 18, BG)

PAGE_W, PAGE_H = 38, 48
FOLD = 9
LINE_COLOR = (80, 80, 90, 220)
ACCENT = (100, 140, 200, 255)

def draw_page(px, py, page_color, fold_color, label=None, font=None):
    d.polygon([
        (px, py + FOLD),
        (px + PAGE_W - FOLD, py),
        (px + PAGE_W, py),
        (px + PAGE_W, py + PAGE_H),
        (px, py + PAGE_H),
    ], fill=page_color)
    d.polygon([
        (px, py + FOLD),
        (px + PAGE_W - FOLD, py),
        (px + PAGE_W - FOLD, py + FOLD),
    ], fill=page_color)
    d.polygon([
        (px + PAGE_W - FOLD, py),
        (px + PAGE_W - FOLD, py + FOLD),
        (px + PAGE_W, py + FOLD),
    ], fill=fold_color)
    if label and font:
        d.text((px + 5, py + 12), label, font=font, fill=(40, 80, 180, 255))

try:
    font_fdx  = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 11)
    font_label = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 9)
except Exception:
    font_fdx = font_label = ImageFont.load_default()

# Left page (cream — fountain .fountain)
px, py = 12, 38
draw_page(px, py, (240, 238, 232, 255), (200, 198, 192, 255))
# Scene heading accent line
d.line([(px+5, py+14), (px+28, py+14)], fill=ACCENT, width=2)
# Body lines
for y_off in [20, 23, 29, 33, 36, 41]:
    d.line([(px+5, py+y_off), (px+30, py+y_off)], fill=LINE_COLOR, width=1)

# Arrow
ARROW = (255, 255, 255, 230)
ax, ay = 59, 62
d.rectangle([ax, ay-2, ax+10, ay+2], fill=ARROW)
d.polygon([(ax+8, ay-6), (ax+18, ay), (ax+8, ay+6)], fill=ARROW)

# Right page (cool white-blue — FDX)
px2, py2 = 79, 38
draw_page(px2, py2, (232, 238, 248, 255), (190, 198, 218, 255), "FDX", font_fdx)
for y_off in [26, 30, 34, 38, 42]:
    d.line([(px2+5, py2+y_off), (px2+30, py2+y_off)], fill=LINE_COLOR, width=1)

out = os.path.join(os.path.dirname(__file__), "icon.png")
img.save(out)
print("Saved:", out)
