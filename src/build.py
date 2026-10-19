import json,os
R='/workspace/soulbound/'
bal=open(R+'plan/balance.json').read();es=open(R+'plan/content/strings/es.json').read();en=open(R+'plan/content/strings/en.json').read()
import base64,glob
art={os.path.basename(f).rsplit('.',1)[0]:('data:image/'+('jpeg' if f.endswith('jpg') else 'png')+';base64,'+base64.b64encode(open(f,'rb').read()).decode()) for f in sorted(glob.glob(R+'prototipo/assets/*.[pj][np]g'))}
js=open(R+'prototipo/src/game.js').read();tj=open(R+'prototipo/src/test.js').read()
html=f'''<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><title>GRIMKEEL: Ocean Surge · Prototipo</title>
<style>html,body{{margin:0;height:100%;background:#000;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}}canvas{{position:absolute;touch-action:none}}#rot{{position:fixed;inset:0;background:#031a2a;color:#fff;font:bold 26px system-ui;display:none;align-items:center;justify-content:center;text-align:center;z-index:9;padding:30px}}</style></head>
<body><canvas id="c"></canvas><div id="rot">⟳</div>
<script>window.BALANCE={bal};window.STR_ES={es};window.STR_EN={en};window.ART={json.dumps(art)};</script>
<script>{js}</script><script>{tj}</script></body></html>'''
for p in [R+'prototipo/index.html',R+'prototipo/grimkeel_prototipo.html']: open(p,'w').write(html)
print(len(html))
