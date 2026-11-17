# ゲームで使う文字だけ Zen Maru Gothic（@fontsource/zen-maru-gothic、OFL）から切り出す
import sys,glob,string
from fontTools import subset
src_dir,root=sys.argv[1],sys.argv[2]
text=set(string.printable)|set('　・〜？！、。「」（）＝─×／')
for f in ['words.js','aliens_data.js','lines.js','game.js','index.html']:
  text|=set(open(f'{root}/{f}',encoding='utf-8').read())
text=''.join(sorted(c for c in text if ord(c)>=32))
for w in ['700','900']:
  o=subset.Options();o.flavor='woff2';o.layout_features=['*'];o.name_IDs=['*']
  f=subset.load_font(f'{src_dir}/zen-maru-gothic-japanese-{w}-normal.woff2',o)
  s=subset.Subsetter(o);s.populate(text=text);s.subset(f)
  subset.save_font(f,f'{root}/fonts/zmg-{w}.woff2',o)
print(len(text))
