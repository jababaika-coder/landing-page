# python build_chars.py <landing dir>  -> heroes.html + characters/<slug>.html
# Пересборка страниц персонажей: python tools/build_chars.py .   (из папки лендинга)
import sys, io, os, html as H
D = sys.argv[1]; os.makedirs(D + '/characters', exist_ok=True)
V = '12'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chars_data import GROUPS
from spoilers_data import SPOILERS

def has_img(slug):
    return os.path.exists(f'{D}/images/heroes/{slug}.webp')

def portrait(slug, mono, name, pre, cls='crew-portrait'):
    img = f'<img loading="lazy" decoding="async" src="{pre}images/heroes/{slug}.webp" alt="{name}" />' if has_img(slug) else ''
    return f'<div class="{cls}" data-monogram="{mono}">{img}</div>'

def head(title, desc, canon, pre):
    home = pre or './'
    return f'''<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{H.escape(desc)}" />
  <link rel="canonical" href="https://orbita-qa.ru/{canon}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://orbita-qa.ru/{canon}" />
  <meta property="og:locale" content="ru_RU" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{H.escape(desc)}" />
  <link rel="icon" href="{pre}images/favicon.ico?v=3" sizes="any" />
  <link rel="icon" href="{pre}images/okulus-icon.png?v=3" type="image/png" />
  <link rel="apple-touch-icon" href="{pre}images/okulus-apple-180.png?v=3" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Exo+2:wght@500;600;700;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="{pre}style.css?v={V}" />
</head>
<body class="heroes-page">
  <header class="site-header">
    <a href="{home}" class="brand" aria-label="Орбита QA — на главную">
      <img src="{pre}images/orbita-qa-badge.webp" alt="Орбита QA" class="brand-logo" />
    </a>
    <nav class="heroes-nav">
      {'<a href="'+pre+'heroes.html" class="heroes-back">Все персонажи</a>' if pre else ''}
      <a href="{home}#crew" class="heroes-back">На главную</a>
    </nav>
  </header>
'''

TAIL = '</body>\n</html>\n'

def tile(c, pre):
    slug, mono, name, role = c[:4]
    return f'''      <a class="char-tile" href="{pre}characters/{slug}.html">
        {portrait(slug, mono, name, pre)}
        <span class="char-tile-name">{name}</span>
        <span class="char-tile-role">{role}</span>
      </a>
'''

# --- список всех персонажей
body = ''.join(f'''    <section class="heroes-group">
      <h2 class="heroes-group-title">{g}</h2>
      <div class="char-grid">
{''.join(tile(c, '') for c in cs)}      </div>
    </section>
''' for g, cs in GROUPS)
page = head('Персонажи вселенной — Орбита QA',
            'Персонажи вселенной «Орбита QA»: Алан, Окулус, Юля, Вадим и все, кого вы встретите в книге «Архив „Константы“» и курсе по тестированию.',
            'heroes.html', '') + f'''
  <main class="section">
    <h1 class="section-title">Персонажи вселенной</h1>
    <p class="heroes-lead">Все, кого вы встретите в книге «Архив „Константы“» и в курсе по тестированию. Без спойлеров — только то, что известно с первых глав. Нажмите на персонажа, чтобы открыть его страницу.</p>
{body}  </main>
''' + TAIL
io.open(D + '/heroes.html', 'w', encoding='utf-8', newline='\n').write(page)

# --- страница каждого персонажа
flat = [(g, c) for g, cs in GROUPS for c in cs]
for i, (g, c) in enumerate(flat):
    slug, mono, name, role, text, where, rows = c[:7]
    spoilers = SPOILERS.get(slug, [])
    def _sp_label(sp):
        if sp['src'] == 'course':
            return 'Спойлер к курсу', 'Курс «Старт в тестировании»' + (', ' + sp['part'] if sp.get('part') else '')
        return 'Спойлер к книге', '«Архив „Константы“»' + (', ' + sp['part'] if sp.get('part') else '')
    spoil_html = ''.join(
        '<details class="char-spoiler"><summary><span class="char-spoiler-warn">' + _sp_label(sp)[0] + '</span> '
        + '<span class="char-spoiler-where">' + _sp_label(sp)[1] + '</span></summary><div class="char-spoiler-body">'
        + ''.join('<p>' + x + '</p>' for x in sp['text']) + '</div></details>'
        for sp in spoilers)
    if spoil_html:
        spoil_html = ('<h2 class="char-h2">Подробнее — со спойлерами</h2>'
                      '<p class="char-spoiler-note">Ниже раскрываются события книги. Если вы ещё не дочитали, лучше не открывать.</p>'
                      + spoil_html)
    prev_ = flat[i - 1][1]; next_ = flat[(i + 1) % len(flat)][1]
    rows_html = ''.join(f'<tr><th>{k}</th><td>{v}</td></tr>' for k, v in [('Роль', role), ('Группа', g)] + rows)
    where_html = ''.join(f'<li><a href="{u}" target="_blank" rel="noopener">{t}</a></li>' for t, u in where)
    mates = ''.join(tile(m, '../') for gg, m in flat if gg == g and m[0] != slug)
    mates_html = f'''    <section class="heroes-group char-mates">
      <h2 class="heroes-group-title">Ещё из группы «{g}»</h2>
      <div class="char-grid">
{mates}      </div>
    </section>
''' if mates else ''
    p = head(f'{name} — персонажи Орбиты QA', f'{name}, {role[0].lower() + role[1:]}. {text[0]}',
             f'characters/{slug}.html', '../') + f'''
  <main class="section char-page">
    <nav class="char-crumbs"><a href="../heroes.html">Персонажи</a> <span>/</span> {g}</nav>
    <div class="char-layout">
      <article class="char-article">
        <h1 class="char-title">{name}</h1>
        <p class="char-lead">{role}</p>
        {''.join('<p>'+x+'</p>' for x in text)}
        {spoil_html}
        <h2 class="char-h2">Где встречается</h2>
        <ul class="char-where">{where_html}</ul>
      </article>
      {('<figure class="char-figure"><img loading="lazy" decoding="async" src="../images/heroes/full/'+slug+'.webp" alt="'+name+' в полный рост" /></figure>') if os.path.exists(D+'/images/heroes/full/'+slug+'.webp') else ''}
      <aside class="char-infobox">
        {portrait(slug, mono, name, '../', 'crew-portrait char-infobox-portrait')}
        <div class="char-infobox-name">{name}</div>
        <table class="char-facts">{rows_html}</table>
      </aside>
    </div>
{mates_html}    <nav class="char-pager">
      <a href="{prev_[0]}.html">← {prev_[2]}</a>
      <a href="{next_[0]}.html">{next_[2]} →</a>
    </nav>
  </main>
''' + TAIL
    io.open(f'{D}/characters/{slug}.html', 'w', encoding='utf-8', newline='\n').write(p)
print('ok', len(flat), 'character pages')
