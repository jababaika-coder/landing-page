# Пересборка раздела «Статьи и материалы»: python tools/build_posts.py .   (из папки лендинга)
# Заменяет всё между <!-- POSTS:START --> и <!-- POSTS:END --> в index.html.
import sys, io, os, re, html as H
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from posts_data import POSTS

D = sys.argv[1]
p = os.path.join(D, 'index.html')
s = io.open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'

def card(x):
    meta = ' · '.join(v for v in (x['where'], x['date'], x['read']) if v)
    return f'''      <article class="post-card">
        <a class="post-cover" href="{x['url']}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
          <img loading="lazy" decoding="async" src="{x['cover']}" alt="{H.escape(x['alt'])}" />
        </a>
        <div class="post-body">
          <div class="post-kind">{x['kind']}</div>
          <h3 class="post-title"><a href="{x['url']}" target="_blank" rel="noopener">{H.escape(x['title'])}</a></h3>
          <div class="post-meta">{H.escape(meta)}</div>
          <p>{H.escape(x['lead'])}</p>
          <a class="infra-card-btn post-btn" href="{x['url']}" target="_blank" rel="noopener">{x['btn']} →</a>
        </div>
      </article>
'''

block = '<!-- POSTS:START -->\n' + ''.join(card(x) for x in POSTS) + '      <!-- POSTS:END -->'
s2, n = re.subn(r'<!-- POSTS:START -->[\s\S]*?<!-- POSTS:END -->', block.replace('\n', nl), s)
assert n == 1, 'нет маркеров POSTS в index.html'
io.open(p, 'w', encoding='utf-8', newline='').write(s2)
print('ok', len(POSTS), 'cards')
