from PIL import Image
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
      w,h=crop.size;S=int(max(w,h)*1.08)
      can=Image.new('RGBA',(S,S),(0,0,0,0));can.paste(crop,((S-w)//2,S-h-(S-max(w,h))//2))
      can=can.resize((300,300),Image.LANCZOS)
      can.save(f'{out}aliens/{n:03d}.webp','WEBP',quality=82,method=4)
for k,name in [(11,'hatch'),(12,'room'),(13,'cockpit'),(14,'home')]:
  Image.open(f'{src}{k}.png').convert('RGB').resize((1280,720),Image.LANCZOS).save(f'{out}bg/{name}.webp','WEBP',quality=80,method=4)
print(n)
