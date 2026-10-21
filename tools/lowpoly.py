# Convierte los sprites realistas (assets/_realista) en low-poly: facetas planas + contorno limpio.
import numpy as np, sys, os, colorsys
from PIL import Image, ImageDraw, ImageFilter
from scipy.spatial import Delaunay
from scipy import ndimage
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
def sat(c,k=1.3,v=1.05):
    h,s,l=colorsys.rgb_to_hsv(*[x/255 for x in c]);s=min(1,s*k);l=min(1,l*v)
    return tuple(int(x*255) for x in colorsys.hsv_to_rgb(h,s,l))
def lowpoly(src,dst,density=26,seed=1):
    rng=np.random.default_rng(seed);im=Image.open(src).convert('RGBA');w,h=im.size;a=np.array(im).astype(float)
    mask=a[...,3]>110
    # puntos: rejilla con jitter + bordes de color fuertes + borde de la silueta
    step=max(10,int(min(w,h)/(4.2 if density<20 else 6.5)))
    ys,xs=np.mgrid[0:h:step,0:w:step];pts=np.stack([xs.ravel()+rng.uniform(-step*.4,step*.4,xs.size),ys.ravel()+rng.uniform(-step*.4,step*.4,xs.size)],1)
    gray=a[...,:3].mean(2);gx=ndimage.sobel(gray,1);gy=ndimage.sobel(gray,0);gm=np.hypot(gx,gy)*mask
    th=np.percentile(gm[mask],93) if mask.any() else 1;cand=np.argwhere(gm>th);
    if len(cand):sel=cand[rng.choice(len(cand),min(len(cand),int(w*h/step/step*.25)),replace=False)];pts=np.vstack([pts,sel[:,::-1]])
    edge=mask^ndimage.binary_erosion(mask,iterations=1);ec=np.argwhere(edge)
    if len(ec):sel=ec[rng.choice(len(ec),min(len(ec),int(len(ec)/(step*1.1))+1),replace=False)];pts=np.vstack([pts,sel[:,::-1]])
    pts=np.vstack([pts,[[0,0],[w-1,0],[0,h-1],[w-1,h-1]]]);pts[:,0]=pts[:,0].clip(0,w-1);pts[:,1]=pts[:,1].clip(0,h-1)
    tri=Delaunay(pts);S=3;out=Image.new('RGBA',(w*S,h*S),(0,0,0,0));d=ImageDraw.Draw(out)
    for t in tri.simplices:
        P=pts[t];cx,cy=P.mean(0)
        # color medio de la faceta (muestreo de 7 puntos)
        sm=[P.mean(0)]+[(P[i]*.6+P.mean(0)*.4) for i in range(3)]+[(P[i]+P[(i+1)%3])/2*.7+P.mean(0)*.3 for i in range(3)]
        cols=[a[int(min(h-1,max(0,y))),int(min(w-1,max(0,x)))] for x,y in sm];cols=[c for c in cols if c[3]>60]
        if not cols:continue
        c=np.mean(cols,0);col=sat(c[:3],1.35,1.1);col=tuple(int(round(x/12)*12) for x in col)
        d.polygon([(x*S,y*S) for x,y in P],fill=col+(255,))
    # líneas de faceta muy suaves para marcar el plano
    lines=Image.new('RGBA',out.size,(0,0,0,0));dl=ImageDraw.Draw(lines)
    for t in tri.simplices:
        P=pts[t];dl.line([(x*S,y*S) for x,y in P]+[(P[0][0]*S,P[0][1]*S)],fill=(10,14,22,38),width=2)
    out=Image.alpha_composite(out,lines).resize((w,h),Image.LANCZOS)
    o=np.array(out);m2=ndimage.binary_opening(mask,iterations=1)|ndimage.binary_erosion(mask,iterations=0)
    o[...,3]=np.where(m2,255,0)
    # contorno limpio: 2 px por dentro de la silueta
    ring=m2^ndimage.binary_erosion(m2,iterations=3)
    o[ring]=[14,18,26,255]
    # antialias de la silueta
    al=Image.fromarray((m2*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6));o[...,3]=np.minimum(o[...,3],np.array(al)+0)
    o[...,3]=np.where(m2,np.maximum(np.array(al),200),0)
    Image.fromarray(o).save(dst,optimize=True)
def sea(dst,pal,seed=3,N=150,size=512,light=(.5,-.6,.62)):
    rng=np.random.default_rng(seed);p=rng.uniform(0,size,(N,2));hgt=rng.uniform(0,1,N)
    P=[];Hh=[]
    for dx in (-size,0,size):
        for dy in (-size,0,size):P.append(p+[dx,dy]);Hh.append(hgt)
    P=np.vstack(P);Hh=np.concatenate(Hh);tri=Delaunay(P);S=2;im=Image.new('RGB',(size*S,size*S));d=ImageDraw.Draw(im)
    L=np.array(light);L=L/np.linalg.norm(L);pal=[np.array(c,float) for c in pal]
    for t in tri.simplices:
        Q=P[t]
        if not ((Q[:,0].max()>0)&(Q[:,0].min()<size)&(Q[:,1].max()>0)&(Q[:,1].min()<size)):continue
        v=np.c_[Q,Hh[t]*16];n=np.cross(v[1]-v[0],v[2]-v[0]);n=n/np.linalg.norm(n);n=n if n[2]>0 else -n
        sh=max(0,np.dot(n,L));k=min(.999,max(0,.18+(sh-.55)*1.6));i=k*(len(pal)-1);j=int(i);f=i-j
        col=pal[j]*(1-f)+pal[min(j+1,len(pal)-1)]*f
        d.polygon([(x*S,y*S) for x,y in Q],fill=tuple(int(x) for x in col),outline=tuple(int(x*.93) for x in col))
    im.resize((size,size),Image.LANCZOS).save(dst,quality=90)
if __name__=='__main__':
    A=R+'assets/';SRC=A+'_realista/'
    for f in sorted(os.listdir(SRC)):
        if f.endswith('.png'):lowpoly(SRC+f,A+f,density=22 if f.startswith(('kraken','lev_cabeza')) else 16);print('ok',f)
    PAL={'mar':[(10,92,112),(16,128,145),(28,160,170),(70,196,196)], # M1 turquesa
         'mar_w2':[(40,38,58),(70,64,96),(104,96,132),(150,146,170)], # M2 gris/violeta/blanco
         'mar_w3':[(14,10,12),(42,22,16),(96,44,16),(180,92,24)],   # M3 negro/naranja (sin rojo vivo: el rojo es para avisos)
         'mar_w4':[(40,96,136),(70,140,180),(120,190,215),(190,232,240)]} # M4 azul claro/blanco/cian
    for k,p in PAL.items():sea(A+k+'.jpg',p,seed=len(k));print('ok',k)
