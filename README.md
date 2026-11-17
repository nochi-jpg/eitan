# えいたんエイリアン

小学校の英単語660語を、えいりあんといっしょに おぼえる 単語帳アプリ。

- れんしゅう（カード）／しけん（4たく）／にんてい（スペル入力）
- しけん・にんていで えねるぎーを ためて がちゃ → えいりあん100体を あつめる（全単語クリアで ちょうど コンプ）
- 仕様書：[SPEC.md](SPEC.md)

## ファイル
| ファイル | 中身 |
|---|---|
| index.html / style.css / game.js | 本体 |
| words.js | 単語データ（tools/words_src.txt から tools/build_words.py で生成） |
| aliens_data.js / lines.js | えいりあんのデータ・セリフ |
| se.js | 効果音（過去作から流用） |
| images/ | えいりあん切り出し・背景（tools/cut.py で assets_src から生成） |
| fonts/ | Zen Maru Gothic（OFL）の使う文字だけ（tools/build_font.py） |
| dist/eitan.html | 1ファイル版（tools/build_single.py。Canva・直配布用、約3.2MB） |

## 作り直すとき
```
python3 tools/build_words.py tools/words_src.txt words.js
python3 tools/build_font.py <fontsourceのfilesフォルダ> .
python3 tools/build_single.py .
```
