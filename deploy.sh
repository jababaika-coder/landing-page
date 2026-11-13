#!/bin/bash
# Выкладка лендинга на прод — отдельно от Кроны.
#
# Выкладывается ЗАКОММИЧЕННОЕ состояние (git archive HEAD), а не рабочая копия:
# так на сервер не уедут недоделанные правки.
#
# Файлы синхронизируются в ту же папку /opt/orbita/landing-page, которая
# смонтирована в nginx (см. backend/docker-compose.yml). Папку нельзя подменять
# переименованием — в контейнере остался бы старый каталог, поэтому rsync на месте.
# Пересборка образа и рестарт nginx не нужны: изменения видны сразу.
#
# Использование (Git Bash, из папки лендинга):  ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
HOST="${LANDING_HOST:-root@179.252.220.244}"
DEST=/opt/orbita/landing-page
STAGE=/var/tmp/landing-stage

if [ -n "$(git status --porcelain)" ]; then
  echo "Есть незакоммиченные изменения — они НЕ будут выложены (выкладывается HEAD):" >&2
  git status --short >&2
fi
echo "Выкладываю $(git log --oneline -1)"

git archive --format=tar HEAD -- . ':!deploy.sh' ':!.gitignore' ':!README.md' ':!tools' \
  | ssh "$HOST" "set -e; rm -rf $STAGE; mkdir -p $STAGE; tar -xf - -C $STAGE; \
      rsync -a --delete --exclude videos $STAGE/ $DEST/; rm -rf $STAGE; \
      echo 'Готово, на сервере:'; ls $DEST"
