from PIL import Image,ImageDraw,ImageFont
import os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
bg=Image.open(R+'tools/titulo_lowpoly_fondo.jpg').convert('RGB');W,H=1560,720
s=W/bg.width;bg=bg.resize((W,int(bg.height*s)),Image.LANCZOS);y0=(bg.height-H)//2+40;bg=bg.crop((0,y0,W,y0+H))
F='/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf';FS='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
for lang,tag in (('es','COMANDA TU FLOTA, EMBISTE LA LÍNEA ENEMIGA Y DOMINA LOS MARES'),('en','COMMAND YOUR FLEET, RAM THE ENEMY LINE AND RULE THE SEAS')):
    im=bg.copy();d=ImageDraw.Draw(im,'RGBA');d.polygon([(0,470),(760,470),(800,700),(0,700)],fill=(6,10,24,150))
    f1=ImageFont.truetype(F,116);f2=ImageFont.truetype(F,46);f3=ImageFont.truetype(FS,17)
    def tx(x,y,t,f,c,o=6):d.text((x,y),t,font=f,fill=c,stroke_width=o,stroke_fill=(8,10,20))
    tx(40,480,'GRIMKEEL',f1,(236,244,255));tx(150,610,'OCEAN SURGE',f2,(240,190,70),5);tx(42,670,tag,f3,(230,236,245),3)
    im.save(R+'assets/titulo_%s.jpg'%lang,quality=88)
