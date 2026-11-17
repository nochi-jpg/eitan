import json,re,sys
src,out=sys.argv[1],sys.argv[2]
cats=[];
for line in open(src,encoding='utf-8'):
  line=line.strip()
  if not line: continue
  if line.startswith('#'): cats.append({'name':line[1:].strip(),'w':[]});continue
  e,j=line.split('|');cats[-1]['w'].append([e.strip(),j.strip()])
allw=[w for c in cats for w in c['w']]
en=[w[0].lower() for w in allw]; ja=[w[1] for w in allw]
dup=lambda L:{x for x in L if L.count(x)>1}
print('total',len(allw),[ (c['name'],len(c['w'])) for c in cats])
print('dup en',dup(en),'dup ja',dup(ja))
assert len(allw)==660 and all(len(c['w'])%10==0 for c in cats)
open(out,'w',encoding='utf-8').write('// 小学校の英単語 660語（16カテゴリ）。[英語, 日本語の意味]\nwindow.EW_CATS='+json.dumps(cats,ensure_ascii=False,separators=(',',':'))+';\n')
