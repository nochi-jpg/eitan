from PIL import Image
from scipy import ndimage
import json,os
OVR=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'hole_overrides.json'))) if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)),'hole_overrides.json')) else {}
TEX=float(os.environ.get('TEX','0.25'))
DIAG={}
import numpy as np
src='/home/claude/eitan/assets_src/';out='/home/claude/eitan/images/'
for i in range(1,11):
  im=Image.open(f'{src}{i}.png').convert('RGBA');a=np.array(im)[...,3]>20
  for c in range(5):
    x0=c*384;strip=a[:,x0:x0+384]
    rows=strip.any(1);bands=[];s0=None
    for y,v in enumerate(rows):
      if v and s0 is None:s0=y
      if not v and s0 is not None:bands.append([s0,y]);s0=None
    if s0 is not None:bands.append([s0,1080])
    mains=[k for k,bb in enumerate(bands) if bb[1]-bb[0]>=100]
    assert len(mains)==2,(i,c,bands)
    for r,k in enumerate(mains):
      t,b=bands[k]
      j=k-1
      while j>=0 and bands[j][1]-bands[j][0]>=50 and t-bands[j][1]<=30: t=bands[j][0];j-=1
      j=k+1
      while j<len(bands) and bands[j][1]-bands[j][0]>=50 and bands[j][0]-b<=30: b=bands[j][1];j+=1
      n=i*10-10+r*5+c+1;y0=0;cell=strip
      ch=[(t,b)]
      sub=cell[t:b];prof=sub.any(0);runs=[];st=None;gap=0
      for x,v in enumerate(list(prof)+[False]*20):
        if v:
          if st is None: st=x
          last=x;gap=0
        elif st is not None:
          gap+=1
          if gap>14: runs.append((st,last+1,int(sub[:,st:last+1].sum())));st=None
      l,rr,_=max(runs,key=lambda r:r[2])
      crop=im.crop((x0+l,y0+t,x0+rr,y0+b))
      # 白い ところが すけないように（元画像は 白はいけいを ぬいたときに 内がわの 白まで ぬけている）
      ca=np.array(crop).astype(np.float32);al=ca[...,3];low=al<128;K=7
      def keep_big(m,minsz):
        l,n=ndimage.label(m)
        if not n: return np.zeros_like(m)
        sz=ndimage.sum(m,l,range(1,n+1));return np.isin(l,[k+1 for k,v in enumerate(sz) if v>=minsz])
      def border_comp(m):
        l,_=ndimage.label(m);e=set(np.unique(np.concatenate([l[0],l[-1],l[:,0],l[:,-1]])))-{0};return np.isin(l,list(e))
      # (1) 線の小さな すきまを ふさいでも 外と つながらない あな
      closed=ndimage.binary_closing(np.pad(~low,K+2),iterations=K)[K+2:-K-2,K+2:-K-2]
      outside=ndimage.binary_dilation(border_comp(~closed),iterations=K+1)&low
      holes=low&~outside
      # (2) からだの いちばん大きい かたまりに 上下左右 かこまれた 大きい ところ
      body=ndimage.binary_closing(np.pad(~low,4),iterations=3)[4:-4,4:-4]
      bl,bn=ndimage.label(body)
      if bn:
        sz=ndimage.sum(body,bl,range(1,bn+1));main=np.isin(bl,[k+1 for k,v in enumerate(sz) if v>=0.2*max(sz)])
        acc=lambda m,ax,rev:(np.flip(np.maximum.accumulate(np.flip(m,ax),axis=ax),ax) if rev else np.maximum.accumulate(m,axis=ax))
        inside=acc(main,1,0)&acc(main,1,1)&acc(main,0,0)&acc(main,0,1)
        holes|=keep_big(low&inside&~holes,2500)
      # (3) ほそい みぞ だけで 外と つながっている ところ
      out0=low&~holes
      op=ndimage.binary_opening(out0,iterations=6)
      reach=ndimage.binary_dilation(border_comp(op),iterations=7)&out0
      holes|=keep_big(out0&~reach,900)
      # あなを 1つずつ しらべる：絵の具の むら（うすい色）が のこっている＝もともと白い ところ、まっさらな とうめい＝はいけいの すきま
      hl,hn=ndimage.label(holes);decide=np.zeros_like(holes)
      ov=OVR.get(str(n),{})
      info=[]
      for k in range(1,hn+1):
        m=hl==k;area=int(m.sum());tex=float((al[m]>8).mean());cy,cx=[float(v) for v in ndimage.center_of_mass(m)]
        auto=True
        idx=len(info)+1
        f=auto
        if idx in ov.get('keep',[]): f=False
        if idx in ov.get('fill',[]): f=True
        info.append((idx,area,round(tex,2),int(cx),int(cy),f))
        if f: decide|=m
      DIAG[n]=(info,hl)
      holes=decide
      fill=~ndimage.binary_dilation(low&~holes,iterations=2)
      a1=al[...,None]/255.0
      ca[...,:3]=np.where(fill[...,None],ca[...,:3]*a1+255*(1-a1),ca[...,:3]);ca[...,3]=np.where(fill,255,al)
      crop=Image.fromarray(ca.clip(0,255).astype(np.uint8),'RGBA')
      if os.environ.get('DIAGOUT'):
        from PIL import ImageDraw
        info,hl=DIAG[n];bg=Image.new('RGBA',crop.size,(201,184,255,255));bg.alpha_composite(crop)
        ov_=np.zeros((*hl.shape,4),np.uint8)
        for (idx,area,tex,cx,cy,f) in info:
          ov_[hl==idx]=((255,60,60,150) if f else (40,200,80,170)) if area>=120 else (0,0,0,0)
        bg.alpha_composite(Image.fromarray(ov_,'RGBA'));d=ImageDraw.Draw(bg)
        from PIL import ImageFont
        fnt=ImageFont.load_default(size=26)
        for (idx,area,tex,cx,cy,f) in info:
          if area>=120: d.text((cx-8,cy-14),str(idx),fill=(0,0,0,255),font=fnt,stroke_width=3,stroke_fill=(255,255,255,255))
        bg.convert('RGB').save(os.environ['DIAGOUT']+f'/{n:03d}.png')
        open(os.environ['DIAGOUT']+f'/{n:03d}.txt','w').write(repr(info))
      w,h=crop.size;S=int(max(w,h)*1.08)
      can=Image.new('RGBA',(S,S),(0,0,0,0));can.paste(crop,((S-w)//2,S-h-(S-max(w,h))//2))
      can=can.resize((300,300),Image.LANCZOS)
      can.save(f'{out}aliens/{n:03d}.webp','WEBP',quality=82,method=4)
for k,name in [(11,'hatch'),(12,'room'),(13,'cockpit'),(14,'home')]:
  Image.open(f'{src}{k}.png').convert('RGB').resize((1280,720),Image.LANCZOS).save(f'{out}bg/{name}.webp','WEBP',quality=80,method=4)
print(n)
