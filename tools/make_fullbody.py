# Фигуры персонажей в полный рост на прозрачном фоне -> images/heroes/full/<slug>.webp
# python tools/make_fullbody.py .     (из папки лендинга)
# Источник с прозрачностью берётся как есть; с белым фоном — фон вырезается заливкой от краёв.
import os, sys
from collections import deque
from PIL import Image, ImageFilter

D = sys.argv[1]
B = 'C:/Users/ASUS/Pictures/Курс по тестированию/Книга/'
SRC = {
    'alan':      'Алан Климов/Книга 1/Gemini_Generated_Image_9mn9wm9mn9wm9mn9.jpg',
    'okulus':    'Gemini_Generated_Image_7xcbij7xcbij7xcb.png',
    'yulia':     'Юля Климова/Gemini_Generated_Image_4i6eog4i6eog4i6e.png',
    'vadim':     'Вадим Северов/Книга 1/Gemini_Generated_Image_vt90e3vt90e3vt90-removebg-preview.png',
    'andrey':    'Андрей Климов/Gemini_Generated_Image_1lfg651lfg651lfg.jpg',
    'albina':    'Альбина Климова/Gemini_Generated_Image_q2kl23q2kl23q2kl.jpg',
    'panov':     'Майор Панов/Gemini_Generated_Image_ipwgc2ipwgc2ipwg-Photoroom.png',
    'polkovnik': 'Александр Северов/Gemini_Generated_Image_hc6gtmhc6gtmhc6g.jpg',
    'serega':    'Сергей Логинов/magnific_rleFAOPxtc.png',
    'mihalych':  'Егор Михалыч/magnific_MXwz1ZsDCm.png',
    'vladimir':  'magnific_._hE2YpS5vqL (1).png',
    'kostya':    'Костя/Gemini_Generated_Image_tc2omltc2omltc2o.jpg',
    'maya':      'Майя Логинова/Gemini_Generated_Image_1378kz1378kz1378.jpg',
    'max':       'Макс/Gemini_Generated_Image_g6eqjmg6eqjmg6eq.jpg',
    'rita':      'Рита/Gemini_Generated_Image_8v6yg8v6yg8v6yg8.jpg',
    'romka':     'Ребята с велопрогулки/Detailed_character_development_f…_2K_202609050135.jpeg',
}
OUT = os.path.join(D, 'images/heroes/full'); os.makedirs(OUT, exist_ok=True)

def cut_white(im, tol=50):
    im = im.convert('RGB'); w, h = im.size
    small = im if max(w, h) <= 1400 else im.resize((w * 1400 // max(w, h), h * 1400 // max(w, h)))
    sw, sh = small.size; px = small.load()
    bg = [[False] * sw for _ in range(sh)]
    q = deque()
    for x in range(sw): q.append((x, 0)); q.append((x, sh - 1))
    for y in range(sh): q.append((0, y)); q.append((sw - 1, y))
    while q:
        x, y = q.popleft()
        if bg[y][x]: continue
        r, g, b = px[x, y]
        t = 95 if y > sh * 0.9 else tol   # внизу — ещё и серая тень под ногами
        if 255 - min(r, g, b) > t or max(r, g, b) - min(r, g, b) > 18: continue
        bg[y][x] = True
        for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
            if 0 <= nx < sw and 0 <= ny < sh and not bg[ny][nx]: q.append((nx, ny))
    # дырки между ногами/руками: замкнутые почти белые области заметного размера
    seen = [[False] * sw for _ in range(sh)]
    for y0 in range(sh):
        for x0 in range(sw):
            if bg[y0][x0] or seen[y0][x0]: continue
            r, g, b = px[x0, y0]
            if min(r, g, b) < 246 or max(r, g, b) - min(r, g, b) > 8: continue
            comp = []; q2 = deque([(x0, y0)]); seen[y0][x0] = True
            while q2:
                x, y = q2.popleft(); comp.append((x, y))
                for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                    if 0 <= nx < sw and 0 <= ny < sh and not seen[ny][nx] and not bg[ny][nx]:
                        rr, gg, bb = px[nx, ny]
                        if min(rr, gg, bb) >= 236 and max(rr, gg, bb) - min(rr, gg, bb) <= 10:
                            seen[ny][nx] = True; q2.append((nx, ny))
            if len(comp) > sw * sh * 0.00012:
                for x, y in comp: bg[y][x] = True
    m = Image.new('L', (sw, sh), 255); mp = m.load()
    for y in range(sh):
        row = bg[y]
        for x in range(sw):
            if row[x]: mp[x, y] = 0
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8)).resize((w, h), Image.LANCZOS)
    out = im.convert('RGBA'); out.putalpha(m); return out

for slug, rel in SRC.items():
    im = Image.open(B + rel)
    has_alpha = im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getchannel('A').getextrema()[0] < 10
    im = im.convert('RGBA') if has_alpha else cut_white(im)
    im = im.crop(im.getchannel('A').getbbox())
    if im.height > 1000: im = im.resize((im.width * 1000 // im.height, 1000), Image.LANCZOS)
    im.save(os.path.join(OUT, slug + '.webp'), 'WEBP', quality=82)
    print(slug, im.size, os.path.getsize(os.path.join(OUT, slug + '.webp')) // 1024, 'KB')
