# 1ファイル版（dist/eitan.html）をつくる。画像・フォント・効果音を ぜんぶ うめこむ
import base64,glob,json,os,re,sys
root=sys.argv[1]
b64=lambda p,m:'data:%s;base64,%s'%(m,base64.b64encode(open(p,'rb').read()).decode())
html=open(f'{root}/index.html',encoding='utf-8').read()
css=open(f'{root}/style.css',encoding='utf-8').read()
for w in ['700','900']:
  css=css.replace(f'url("fonts/zmg-{w}.woff2")','url("%s")'%b64(f'{root}/fonts/zmg-{w}.woff2','font/woff2'))
html=html.replace('<link rel="stylesheet" href="style.css">','<style>\n'+css+'\n</style>')
imgs={}
for p in sorted(glob.glob(f'{root}/images/*/*.webp')):
  imgs[os.path.relpath(p,root).replace(os.sep,'/')]=b64(p,'image/webp')
def js(name):
  if name=='images.js': return 'window.EA_IMG='+json.dumps(imgs)+';'
  return open(f'{root}/{name}',encoding='utf-8').read()
html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>\n'+js(m.group(1)).replace('</script','<\\/script')+'\n</script>',html)
os.makedirs(f'{root}/dist',exist_ok=True)
open(f'{root}/dist/eitan.html','w',encoding='utf-8').write(html)
print('%.2f MB'%(os.path.getsize(f'{root}/dist/eitan.html')/1e6))
