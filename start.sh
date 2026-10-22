#!/bin/sh
# ワイプ・アーケードをサーバーで開く（packs フォルダの JSON をそのまま読める）
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  node tools/serve.mjs "$@"
else
  echo "Node.js が見つかりませんでした。index.html をブラウザで開いても遊べます。"
fi
