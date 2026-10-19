"use strict";
const B=window.BALANCE, STR={es:window.STR_ES,en:window.STR_EN};
const UI={es:{tap:"TOCA PARA ZARPAR",sub:"Prototipo jugable · sensación y dificultad",ctrl:"Izquierda: arrastra para mover · Disparo automático · Botón ⚡ = embestida",kb:"PC: WASD/flechas mover · Espacio embestida · E escudo · Q misiles · B (prueba) cambia cañones",rot:"Gira el teléfono en horizontal",choose:"ELIGE UNA MEJORA",reroll:"Cambiar cartas (1 gratis)",sunk:"¡TE HUNDIERON!",revq:"¿Seguir con 50 % de vida?",revvid:"▶ Ver vídeo (simulado)",revdia:"💎 20 diamantes (simulado)",revfree:"Revivir gratis (primer viaje)",giveup:"Rendirse",watching:"Vídeo simulado… {s}",res:"RESULTADOS",score:"Puntuación",time:"Tiempo",kills:"Hundidos",souls:"Almas",coins:"Doblones",lvl:"Nivel",again:"JUGAR OTRA VEZ",boss:"¡JEFE!",cleared:"¡Oleada superada!",veilready:"Velo listo",lvlshort:"Nv",rare:{comun:"Común",rara:"Rara",epica:"Épica",legendaria:"Legendaria"},newc:"NUEVA",dmgt:"Daño recibido"},
en:{tap:"TAP TO SET SAIL",sub:"Playable prototype · feel & difficulty",ctrl:"Left side: drag to steer · Auto-fire · ⚡ button = ram",kb:"PC: WASD/arrows move · Space ram · E shield · Q missiles · B (debug) cycle barrels",rot:"Rotate your phone to landscape",choose:"CHOOSE AN UPGRADE",reroll:"Reroll (1 free)",sunk:"YOU WERE SUNK!",revq:"Continue with 50% health?",revvid:"▶ Watch video (simulated)",revdia:"💎 20 diamonds (simulated)",revfree:"Free revive (first voyage)",giveup:"Give up",watching:"Simulated video… {s}",res:"RESULTS",score:"Score",time:"Time",kills:"Sunk",souls:"Souls",coins:"Doubloons",lvl:"Level",again:"PLAY AGAIN",boss:"BOSS!",cleared:"Wave cleared!",veilready:"Veil ready",lvlshort:"Lv",rare:{comun:"Common",rare:"Rare",rara:"Rare",epica:"Epic",legendaria:"Legendary"},newc:"NEW",dmgt:"Damage taken"}};
let lang=localStorage.getItem("gk_lang")||"es";
const u=k=>UI[lang][k]; const t=(k,f)=>(STR[lang]&&STR[lang][k])||f||k;
const W=1560,H=720,PX=15; // 104 u visible
const cv=document.getElementById("c"),g=cv.getContext("2d");
let scale=1,offX=0,offY=0;
function resize(){const w=innerWidth,h=innerHeight;scale=Math.min(w/W,h/H);cv.width=Math.round(W*scale*devicePixelRatio);cv.height=Math.round(H*scale*devicePixelRatio);cv.style.width=W*scale+"px";cv.style.height=H*scale+"px";offX=(w-W*scale)/2;offY=(h-H*scale)/2;cv.style.left=offX+"px";cv.style.top=offY+"px";document.getElementById("rot").style.display=(h>w&&("ontouchstart" in window||navigator.maxTouchPoints>0))?"flex":"none";document.getElementById("rot").textContent=u("rot");}
addEventListener("resize",resize);
const J=B.jugador,E=B.enemigos,C=B.cartas,P=B.partida,MAG=J.cargador,VEL=C.lista.find(c=>c.id=="velo_de_bruma");
const AF=B.controles.disparo_automatico, ORB=B.almas.orbe;
const rnd=(a,b)=>a+Math.random()*(b-a), D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y), ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const angDiff=(a,b)=>{let d=b-a;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;};
// cards implemented in prototype
const IMPL=["cohetes_extra","polvora_negra","bala_de_alma","polvora_fina","cargadores","gatillo","capacidad","casco","velas","iman","canon_doble","regeneracion","critico","escudo_templado","velo_de_bruma"];
const CARDS=C.lista.filter(c=>IMPL.includes(c.id));window.__CARDS=CARDS;
let S; // state
// ===== ARTE (sprites PNG incrustados; window.ART = {nombre: dataURI}) =====
const IMG={};let artReady=0,artTotal=0;
for(const k in (window.ART||{})){artTotal++;const im=new Image();im.onload=()=>{artReady++;};im.onerror=()=>{console.error("sprite "+k);};im.src=window.ART[k];IMG[k]=im;}
const ok=k=>IMG[k]&&IMG[k].complete&&IMG[k].naturalWidth>0;
function spr(k,w,h){const im=IMG[k];if(!ok(k))return false;const hh=h||w*im.naturalHeight/im.naturalWidth;g.drawImage(im,-w/2,-hh/2,w,hh);return true;}
function sprFlash(k,w,h,a){if(a<=0||!ok(k))return;g.save();g.globalAlpha=Math.min(1,a*8);g.globalCompositeOperation="lighter";spr(k,w,h);g.restore();}
let seaPat=null;
// ===== FORMAS Y ALAS AZULES (JuAn 19-10-2026). En el juego la forma sale del Arsenal; aquí se elige en la pantalla de inicio
const FORMS=["corbeta","fragata","acorazado","destructor","dreadnought"],AL=B.alas_azules;
let form=+(localStorage.getItem("gk_form")||1);
const ALAS_PROTO={bloquear_balas_desde_forma:5}; // simula Arsenal «Alas azules» nivel 5 en la forma 5
function wingCfg(){return AL&&AL.formas[form]||null;}
function wingSegs(){const w=wingCfg();if(!w)return[];const p=S.p,px=-Math.sin(p.a),py=Math.cos(p.a),r0=J.radius*.55,bx=p.x-Math.cos(p.a)*.6,by=p.y-Math.sin(p.a)*.6;
 return[-1,1].map(sg=>({x1:bx+px*r0*sg,y1:by+py*r0*sg,x2:bx+px*(r0+w.largo_u)*sg-Math.cos(p.a)*1.2,y2:by+py*(r0+w.largo_u)*sg-Math.sin(p.a)*1.2,hw:w.ancho_u/2}));}
function segDist(q,s_){const dx=s_.x2-s_.x1,dy=s_.y2-s_.y1,l=dx*dx+dy*dy,t_=Math.max(0,Math.min(1,((q.x-s_.x1)*dx+(q.y-s_.y1)*dy)/l));return Math.hypot(q.x-(s_.x1+dx*t_),q.y-(s_.y1+dy*t_));}
function wingsTick(dt){const w=wingCfg();if(!w)return;const segs=wingSegs();
 for(const e of S.en){if(e.dead)continue;e.wingCd=Math.max(0,(e.wingCd||0)-dt);if(e.wingCd>0)continue;const r=e.r||e.d.radius;
  if(segs.some(sg=>segDist(e,sg)<r+sg.hw)){e.wingCd=AL.enfriamiento_por_enemigo_s;enemyHit(e,w.dano_choque*(e==S.boss?.5:1));S.log.wingHits=(S.log.wingHits||0)+1;burst(e.x,e.y,"#5ab8ff",12);}}
 if(form>=ALAS_PROTO.bloquear_balas_desde_forma)for(const b of S.eb){if(b.life>0&&segs.some(sg=>segDist(b,sg)<sg.hw+b.r)){b.life=0;burst(b.x,b.y,"#9fd8ff",5);S.log.wingBlocks=(S.log.wingBlocks||0)+1;}}}
function newRun(){const p={x:0,y:0,a:-Math.PI/2,v:0,hp:J.maxHealth,maxHp:J.maxHealth,mag:MAG.balas,shotT:0,reload:0,shieldT:0,shieldCd:0,inv:0,veilT:0,veilCd:0,ambush:0,ramT:0,ramCd:0,ramDir:0,hitIds:new Set(),tgt:null,tgtT:0,contactT:0};
S={mode:"title",time:0,p,en:[],bul:[],eb:[],orbs:[],fx:[],zones:[],txt:[],wave:0,waveT:0,groups:0,groupT:0,boss:null,souls:0,soulsTot:0,coins:0,lvl:1,kills:0,score:0,cards:{},revived:false,firstVoyage:!localStorage.getItem("gk_played"),dmgTaken:0,waveDamage:0,banner:null,offer:null,rerolls:C.rerolls_gratis_por_partida,cam:{x:0,y:0},shake:0,forceVeil:true,result:null,mis:[],log:{shots:0,hits:0,spawned:0,bossSeen:false,dmg:0,veil:0}};}
// ---------- stats from cards
const lvOf=id=>S.cards[id]||0, lvData=(id)=>{const c=CARDS.find(c=>c.id==id),l=lvOf(id);return l?c.niveles[l-1]:null;};
function st(){const s={dmg:J.cannonDamage,mag:MAG.balas,int:MAG.intervalo_s,rel:MAG.recarga_s,crit:J.critico.probabilidad,critX:J.critico.dano_x,extra:0,spd:J.maxForwardSpeed,turn:J.turnSpeed,acc:J.acceleration,magnet:ORB.iman_distancia_u,regen:0,shieldRed:J.shieldDamageReduction,shieldDur:J.soulShieldDuration};
let d;if(d=lvData("polvora_fina"))s.dmg*=d.cannonDamage_x;if(d=lvData("cargadores"))s.rel*=d.recarga_cargador_x;if(d=lvData("gatillo"))s.int*=d.intervalo_x;if(d=lvData("capacidad"))s.mag+=d.cargador_mas;
if(d=lvData("velas")){s.spd*=d.maxForwardSpeed_x;s.turn*=d.turnSpeed_x;s.acc*=d.acceleration_x;}if(d=lvData("iman"))s.magnet*=d.iman_distancia_x;if(d=lvData("canon_doble"))s.extra=d.balas_por_disparo_mas;if(d=lvData("regeneracion"))s.regen=d.vida_por_segundo_mas;if(d=lvData("critico"))s.crit+=d.prob_critico_mas;
if(d=lvData("escudo_templado"))s.shieldDur+=d.soulShieldDuration_mas||0;
if(d=lvData("polvora_negra"))s.dmg*=d.cannonDamage_x;s.pierce=0;if(d=lvData("bala_de_alma")){s.dmg*=d.cannonDamage_x;s.pierce=d.atraviesa_mas;s.pierceX=d.dano_tras_atravesar_x;}
s.dmg=Math.min(s.dmg,J.cannonDamage*3.5);if(d=lvData('cohetes_extra')){s.rmExtra=d.misiles_mas;s.rmCharge=d.carga_x_mas;}
const CVb=B.canon_visual,nB=S&&S.dbgBullets?S.dbgBullets:1+s.extra;s.nBul=nB;s.barrels=Math.min(CVb.max_canones,nB);s.steps=Math.max(0,nB-CVb.max_canones);s.stepX=1+CVb.mas_alla_de_4.dano_x_por_paso*s.steps;s.size=Math.min(CVb.mas_alla_de_4.tamano_max_x,1+CVb.mas_alla_de_4.tamano_x_por_paso*s.steps);s.dmgShown=s.dmg*s.stepX;
s.crit=Math.min(s.crit,J.critico.topes.probabilidad_max);return s;}
// cañones: posición (u, en ejes del cañón) y ángulo de cada boca. 2 = paralelos 1.2 u, 3 = abanico 10°, 4 = 2 paralelos dentro + 2 inclinados fuera
function barrelLayout(n){const r=Math.PI/180;return({1:[[0,0]],2:[[-.6,0],[.6,0]],3:[[-.45,-10*r],[0,0],[.45,10*r]],4:[[-1.05,-12*r],[-.35,0],[.35,0],[1.05,12*r]]})[n];}
// ---------- input
const keys={};addEventListener("keydown",e=>{keys[e.code]=1;if(e.code=="Space")doRam();if(e.code=="KeyE")doShield();if(e.code=="KeyQ")fireMissiles();if(e.code=="KeyB"){S.dbgBullets=((S.dbgBullets||1)%7)+1;}if(["Digit1","Digit2","Digit3"].includes(e.code)&&S.mode=="cards")pickCard(+e.code.slice(5)-1);});addEventListener("keyup",e=>keys[e.code]=0);
let joy=null,taps=[];
// Sensibilidad táctil (JuAn 19-10-2026: «más sensible»). alcance = px de arrastre para ir a tope; giro_x multiplica el giro; suavizado evita temblores
const SENS={baja:{alcance_px:90,zona_muerta:.12,giro_x:1.6,suavizado:.25},normal:{alcance_px:60,zona_muerta:.08,giro_x:2.1,suavizado:.35},alta:{alcance_px:45,zona_muerta:.05,giro_x:2.6,suavizado:.45}};
const SENS_ORDER=["baja","normal","alta"],SENS_LBL={es:{baja:"Baja",normal:"Normal",alta:"Alta"},en:{baja:"Low",normal:"Normal",alta:"High"}};
let sens=localStorage.getItem("gk_sens")||"alta";let smooth=null;
function cycleSens(){sens=SENS_ORDER[(SENS_ORDER.indexOf(sens)+1)%3];localStorage.setItem("gk_sens",sens);}
function toL(e){return{x:(e.clientX-offX)/scale,y:(e.clientY-offY)/scale};}
const BTN={rm:{x:1440,y:440,r:48},ram:{x:1350,y:580,r:62},shield:{x:1200,y:610,r:40},lang:{x:1440,y:40,r:30},sens:{x:1300,y:40,r:30,w:110}};
cv.addEventListener("pointerdown",e=>{e.preventDefault();const q=toL(e);tryFS();
 if(S.mode!="play"){taps.push(q);return;}
 if(D(q,BTN.ram)<BTN.ram.r+10){doRam();return;}if(D(q,BTN.rm)<BTN.rm.r+8){fireMissiles();return;} if(D(q,BTN.shield)<BTN.shield.r+10){doShield();return;}
 if(D(q,BTN.lang)<BTN.lang.r){toggleLang();return;}if(Math.abs(q.x-BTN.sens.x)<60&&Math.abs(q.y-BTN.sens.y)<30){cycleSens();return;}
 if(q.x<W*0.6&&!joy){joy={id:e.pointerId,cx:q.x,cy:q.y,x:q.x,y:q.y};}});
cv.addEventListener("pointermove",e=>{if(joy&&e.pointerId==joy.id){const q=toL(e);joy.x=q.x;joy.y=q.y;}});
const up=e=>{if(joy&&e.pointerId==joy.id)joy=null;};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
function tryFS(){try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen&&!window.__test)document.documentElement.requestFullscreen().then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock("landscape").catch(()=>{})).catch(()=>{});}catch(_){}}
function toggleLang(){lang=lang=="es"?"en":"es";localStorage.setItem("gk_lang",lang);resize();}
let auto=null; // autopilot for tests
function steer(){if(auto)return auto();let x=0,y=0;if(keys.KeyA||keys.ArrowLeft)x--;if(keys.KeyD||keys.ArrowRight)x++;if(keys.KeyW||keys.ArrowUp)y--;if(keys.KeyS||keys.ArrowDown)y++;
 if(x||y){const m=Math.hypot(x,y);return{x:x/m,y:y/m,m:1};}
 if(joy){const dx=joy.x-joy.cx,dy=joy.y-joy.cy,m=Math.hypot(dx,dy),R=SENS[sens].alcance_px;if(m>R){joy.cx=joy.x-dx/m*R;joy.cy=joy.y-dy/m*R;}const mm=Math.min(1,m/R);if(mm<SENS[sens].zona_muerta){smooth=null;return null;}const k=SENS[sens].suavizado;smooth=smooth?{x:smooth.x+(dx/m-smooth.x)*k,y:smooth.y+(dy/m-smooth.y)*k}:{x:dx/m,y:dy/m};const sm=Math.hypot(smooth.x,smooth.y)||1;return{x:smooth.x/sm,y:smooth.y/sm,m:Math.min(1,mm*1.15)};}smooth=null;return null;}
// ---------- spawning
function spawnPos(){const p=S.p,side=Math.random();let x,y;const hw=52+10,hh=24+10;
 if(side<.5){const dir=Math.random()<.6?(Math.cos(p.a)>=0?1:-1):(Math.random()<.5?1:-1);x=p.x+dir*hw;y=p.y+rnd(-hh,hh);}else if(side<.8){x=p.x+rnd(-hw,hw);y=p.y-hh;}else{x=p.x+rnd(-hw,hw);y=p.y+hh;}return{x,y};}
function spawn(type,pos){const e=Object.assign({},E.comun,E[type]);const rv=!isBossWave(S.wave)?RAMP('vida_x'):1.3,rd=!isBossWave(S.wave)?RAMP('dano_x'):1.2;e.health*=DIFF.vida_enemigos_x*rv;e.attackDamage=(e.attackDamage||0)*DIFF.dano_enemigos_x*rd;if(e.dano_explosion)e.dano_explosion*=DIFF.dano_enemigos_x*rd;if(e.fireRate)e.fireRate*=DIFF.cadencia_enemigos_x;if(type=='lancha')e.moveSpeed*=DIFF.lancha_velocidad_x;if(type=='brulote'){e.moveSpeed*=DIFF.brulote_velocidad_x;e.mecha_s*=DIFF.brulote_mecha_x;}const q=pos||spawnPos();const o={type,x:q.x,y:q.y,a:0,vx:0,vy:0,hp:e.health,max:e.health,d:e,fireT:rnd(0.5,e.fireRate||2),dir:Math.random()<.5?1:-1,dirT:rnd(3,5),flee:0,fuse:-1,id:Math.random(),hitFlash:0};S.en.push(o);S.log.spawned++;return o;}
// prototype pacing: waves 1-4 from plan table; each wave sends its group 3 times (12 s apart) so a run lasts ~3-5 min; wave 5 = Leviatán.
const GROUPS_PER_WAVE=4; const groupsFor=w=>2; // 10 oleadas: 2 grupos por oleada para ~5 min
// ===== DIFICULTAD DEL PROTOTIPO (v2 "un poco más difícil", JuAn 19-10-2026). NO está en balance.json; pasar al plan si JuAn lo aprueba =====
const DIFF={version:"proto-v7-serpiente",enemigos_por_grupo_x:1.35,pausa_grupos_x:0.75,vida_enemigos_x:1.2,dano_enemigos_x:1.2,cadencia_enemigos_x:0.85,lancha_velocidad_x:1.2,brulote_velocidad_x:1.15,brulote_mecha_x:0.8,jefe_vida_x:1.35,jefe_dano_x:1.15,jefe_ataques_cada_x:0.8,jefe_velocidad_x:1.15,escudo_automatico:false,
 jefe_v3:{vida_extra_x:1.3,furia_desde:.25,furia:{andanada:{proyectiles:9,abanico_grados:60,cada_s:1.5},brasas:{circulos:12,aviso_s:.75,cada_s:4.5},carga:{cada_s:7,aviso_s:.9,velocidad:42,dura_s:.7,dano:70},invocar:{brulote:2,corsario:2,cada_s:9}},
  blindaje:{cada_s:13,dura_s:2,reduccion:.6},enfado:{tras_s:100,cadencia_x:.7}},
 // rampa por oleada (multiplica sobre lo anterior, oleada 1 = ×1): N = número de oleada
 rampa:{cantidad_x:1.07,vida_x:1.05,dano_x:1.03,pausa_x:0.96}, // 10 oleadas: 8 normales; oleada 9 ≈ ×1.6 cantidad, ×1.5 vida, ×1.3 daño
 extra_por_oleada:{3:{brulote:1},4:{brulote:1},8:{brulote:1},9:{lancha:1}}, // mezcla más dura al final (Bastión antes de su oleada 6 del plan)
 asistencia_punteria_grados_s:120,max_vivos:7};// no salen grupos nuevos si ya hay 7 + oleada enemigos vivos // las balas giran un poco hacia su blanco (si no, las Lanchas en órbita no se pueden cazar)
// ===== IA TÁCTICA (JuAn 19-10-2026, por voz). listo = 0 en la oleada 1 → 1 en la 4 y el jefe
const AIT={esquivar:{prob:{lancha:.6,corsario:.3,brulote:.2,bastion:.05},reaccion_s:.35,dura_s:.35,velocidad_x:1.7,recarga_s:2.5,ve_balas_u:12},
 rodear:{desde_listo:.3}, // corsarios y bastiones toman puestos repartidos en un anillo alrededor del jugador
 descarga:{desde_listo:.33,cada_s:[6,4],tiradores:[2,3],aviso_s:.6}, // varios disparan a la vez tras una línea roja de aviso
 prediccion:{adelanto_s:[.6,1.3],error:.25,reaccion_s:.4,cortan:.4}}; // apuntan y se mueven a donde VAS a estar; el 40 % corta el paso
const smart=()=>isBossWave(S.wave)?1:Math.max(0,Math.min(.8,(normIdx()-1)/7*.8)); // oleada 1 = 0 → oleada 9 = 0.8
function predictP(e){const p=S.p,sm=smart(),la=(e==S.boss?.5:1)*(AIT.prediccion.adelanto_s[0]+(AIT.prediccion.adelanto_s[1]-AIT.prediccion.adelanto_s[0])*sm);
 e.predT=(e.predT||0)-1/60;if(e.predT<=0||!e.pv){e.predT=AIT.prediccion.reaccion_s;const er=1+rnd(-AIT.prediccion.error,AIT.prediccion.error);e.pv={vx:Math.cos(p.a)*p.v*er,vy:Math.sin(p.a)*p.v*er};}
 let ox=e.pv.vx*la*sm,oy=e.pv.vy*la*sm;const om=Math.hypot(ox,oy),cap=Math.max(4,D(e,p)*.6);if(om>cap){ox*=cap/om;oy*=cap/om;}return {x:p.x+ox,y:p.y+oy};}
function aimLead(e,spd){const p=S.p,sm=smart();if(sm<=0||p.veilT>0)return ang(e,targetPos());const d=D(e,p),tt=d/spd*sm,er=1+rnd(-.25,.25);return Math.atan2(p.y+Math.sin(p.a)*p.v*tt*er-e.y,p.x+Math.cos(p.a)*p.v*tt*er-e.x);}
function tacticsTick(dt){const sm=smart(),p=S.p;if(!S.en.length)return;
 // reparto en anillo
 const ring=S.en.filter(e=>e.type=="corsario"||e.type=="bastion");const base=S.time*.15;ring.forEach((e,i)=>{e.slot=base+i*2*Math.PI/ring.length;});
 // cortar el paso: algunos van al punto predicho
 S.en.forEach((e,i)=>{if(e.cutter===undefined)e.cutter=Math.random()<AIT.prediccion.cortan;});
 // descarga coordinada
 if(sm>=AIT.descarga.desde_listo&&p.veilT<=0){S.volleyT=(S.volleyT??4)-dt;if(S.volleyT<=0){const D_=AIT.descarga;S.volleyT=D_.cada_s[0]+(D_.cada_s[1]-D_.cada_s[0])*sm;const n=Math.round(D_.tiradores[0]+(D_.tiradores[1]-D_.tiradores[0])*sm);
  S.en.filter(e=>e!=S.boss&&(e.type=="corsario"||e.type=="lancha"||e.type=="bastion")&&D(e,p)<e.d.attackRange*1.3).slice(0,n).forEach(e=>{e.tele=D_.aviso_s;});}}
 // esquivar
 for(const e of S.en){if(e==S.boss||e.dodgeT>0)continue;e.dodgeCd=(e.dodgeCd||0)-dt;if(e.dodgeCd>0)continue;const pr=(AIT.esquivar.prob[e.type]||0)*sm;if(pr<=0)continue;
  for(const b of S.bul){const dx=e.x-b.x,dy=e.y-b.y,dd=Math.hypot(dx,dy);if(dd>AIT.esquivar.ve_balas_u)continue;const bs=Math.hypot(b.vx,b.vy),along=(dx*b.vx+dy*b.vy)/bs;if(along<0)continue;const perp=(dx*b.vy-dy*b.vx)/bs;if(Math.abs(perp)>(e.d.radius+1.2))continue;
   e.dodgeCd=AIT.esquivar.recarga_s;if(Math.random()<pr){const sgn=perp>=0?1:-1;e.dodgeDelay=AIT.esquivar.reaccion_s;e.dodgeDir={x:b.vy/bs*sgn,y:-b.vx/bs*sgn};S.log.dodges=(S.log.dodges||0)+1;}break;}}}
const RAMP=k=>Math.pow(DIFF.rampa[k],Math.max(0,normIdx()-1));

const TOTAL_OLEADAS=P.oleadas,isBossWave=n=>!!(P.oleadas_tabla[n]&&P.oleadas_tabla[n].jefe);
const normIdx=()=>{let k=0;for(let i=1;i<=S.wave;i++)if(!isBossWave(i))k++;return Math.max(1,k);}; // 1..8
function startWave(n){S.wave=n;S.waveT=0;S.groups=0;S.groupT=0;S.waveDamage=0;S.log.waveStart=S.log.waveStart||{};S.log.waveStart[n]=Math.round(S.time);
 if(isBossWave(n)){const id=P.oleadas_tabla[n].jefe;S.banner={txt:u("boss")+" "+t("boss."+id+".name"),t:P.aviso_jefe_s,boss:1};setTimeout0(()=>id=="kraken"?spawnKraken():spawnBoss(),P.aviso_jefe_s);} else S.banner={txt:t("hud.wave","Oleada {n}/{total}").replace("{n}",n).replace("{total}",TOTAL_OLEADAS)+(n>1?(lang=="es"?" · ¡más dura!":" · tougher!"):""),t:2};}
let timers=[];function setTimeout0(f,s){timers.push({f,t:s});}
function spawnBoss(){const L=B.jefes.leviatan,q=spawnPos();S.boss={type:"boss",x:q.x,y:q.y,a:0,hp:L.health*DIFF.jefe_vida_x*DIFF.jefe_v3.vida_extra_x,max:L.health*DIFF.jefe_vida_x*DIFF.jefe_v3.vida_extra_x,born:S.time,d:L,r:L.radius,phase:0,atk:{},escort:false,id:Math.random(),hitFlash:0,trailT:0};S.en.push(S.boss);mkSerp(S.boss);S.log.bossSeen=true;}
// ===== LEVIATÁN SERPIENTE: cabeza (punto débil) + segmentos que siguen su estela =====
const TRS=.5;
function mkSerp(b){const C=b.d.cuerpo;if(!C)return;b.trail=[];const n=Math.ceil((C.segmentos+2)*C.separacion_u/TRS)+4;for(let k=0;k<n;k++)b.trail.push({x:b.x-k*TRS,y:b.y});b.segs=[];
 for(let i=0;i<C.segmentos;i++){const tail=i==C.segmentos-1,r=C.radio_segmento_u*(tail?.85:1.12-.3*i/C.segmentos);const sg={type:"lev_seg",seg:1,b,i,tail,x:b.x-(i+1)*C.separacion_u,y:b.y,a:0,hp:1,max:1,r,d:{radius:r},id:Math.random(),hitFlash:0};b.segs.push(sg);S.en.push(sg);}}
function serpTick(b,dt){const C=b.d.cuerpo,p=S.p,tr=b.trail;let h=tr[0];let dd=D(b,h);while(dd>=TRS){const k=TRS/dd;h={x:h.x+(b.x-h.x)*k,y:h.y+(b.y-h.y)*k};tr.unshift(h);dd=D(b,h);}tr.length=Math.min(tr.length,Math.ceil((C.segmentos+2)*C.separacion_u/TRS)+4);
 for(const sg of b.segs){const ix=Math.min(tr.length-1,Math.round((sg.i+1)*C.separacion_u/TRS)),q=tr[ix],q0=tr[Math.max(0,ix-1)];sg.x=q.x;sg.y=q.y;if(q0!=q)sg.a=Math.atan2(q0.y-q.y,q0.x-q.x);
  sg.sub=sg.i>=2&&!sg.tail&&Math.sin(S.time*1.6-sg.i*.6)<-.55;
  if(!sg.sub&&D(sg,p)<sg.r+J.radius){p.contactT-=dt;if(p.contactT<=0){p.contactT=.5;playerHit(b.d.dano_contacto*C.contacto_segmento_x*DIFF.jefe_dano_x);}}}
 // latigazo de cola
 const LC=b.d.latigazo_cola,tl=b.segs[b.segs.length-1];b.whipCd=(b.whipCd??LC.cada_s*.5)-dt;
 if(b.whipWarn>0){b.whipWarn-=dt;if(b.whipWarn<=0){S.shake=.25;burst(b.whipPos.x,b.whipPos.y,"#ff7a20",18);S.log.whips=(S.log.whips||0)+1;if(D(p,b.whipPos)<LC.radio+J.radius){playerHit(LC.dano*DIFF.jefe_dano_x);const a=ang(b.whipPos,p);p.x+=Math.cos(a)*LC.empuje_u;p.y+=Math.sin(a)*LC.empuje_u;S.log.whipHits=(S.log.whipHits||0)+1;}}}
 else if(b.whipCd<=0&&D(p,tl)<LC.si_jugador_a_menos_de_u){b.whipCd=LC.cada_s*(b.enraged?.7:1);b.whipWarn=LC.aviso_s;b.whipPos={x:tl.x+(p.x-tl.x)*.5,y:tl.y+(p.y-tl.y)*.5};}
 // aliento de fuego (fase 2 y furia)
 const AF2=b.d.aliento_fuego;if(b.phase>=1||b.furia){b.brCd=(b.brCd??2.5)-dt;
  if(b.brWarn>0){b.brWarn-=dt;b.a=b.brA;if(b.brWarn<=0){b.brT=AF2.dura_s;S.log.breaths=(S.log.breaths||0)+1;}}
  else if(b.brT>0){b.brT-=dt;b.a=b.brA;const jx=b.x+Math.cos(b.brA)*b.r,jy=b.y+Math.sin(b.brA)*b.r,dpl=Math.hypot(p.x-jx,p.y-jy);
   for(let k=0;k<3;k++){const aa=b.brA+rnd(-1,1)*AF2.cono_grados*Math.PI/360,sp=rnd(18,32);S.fx.push({x:jx,y:jy,vx:Math.cos(aa)*sp,vy:Math.sin(aa)*sp,t:AF2.alcance_u/sp,max:AF2.alcance_u/sp,c:["#ffd84a","#ff8a20","#ff4010"][k],big:1});}
   if(dpl<AF2.alcance_u+J.radius&&Math.abs(angDiff(b.brA,Math.atan2(p.y-jy,p.x-jx)))<AF2.cono_grados*Math.PI/360+.1){b.brAcc=(b.brAcc||0)+AF2.dano_s*DIFF.jefe_dano_x*dt;if(b.brAcc>=AF2.dano_s*.25){playerHit(b.brAcc);S.log.breathDmg=(S.log.breathDmg||0)+b.brAcc;b.brAcc=0;}}}
  else if(b.brCd<=0&&D(b,p)<AF2.alcance_u*1.25&&!(b.chargeT>0||b.chargeWarn>0)){b.brCd=b.furia?AF2.furia_cada_s:AF2.cada_s;b.brWarn=AF2.aviso_s;b.brA=ang(b,p);floatT(b.x,b.y-9,lang=="es"?"¡ALIENTO DE FUEGO!":"FIRE BREATH!","#ff6020",1);}}}
function waveLogic(dt){if(S.wave==0)return;S.waveT+=dt;if(!isBossWave(S.wave)){const tab=P.oleadas_tabla[S.wave],ext=DIFF.extra_por_oleada[S.wave]||{};S.groupT-=dt;
 if(S.groups<groupsFor(S.wave)&&(S.groupT<=0&&S.en.length<DIFF.max_vivos+Math.min(3,normIdx())||S.en.length==0&&S.groups>0)){for(const k in tab)for(let i=0;i<Math.round(tab[k]*DIFF.enemigos_por_grupo_x*RAMP('cantidad_x'));i++)spawn(k);for(const k in ext)for(let i=0;i<ext[k];i++)spawn(k);S.groups++;S.groupT=P.tiempo_max_oleada_s*DIFF.pausa_grupos_x*RAMP('pausa_x');}
 if(S.groups>=groupsFor(S.wave)&&S.en.length==0&&!S.clearT){S.clearT=P.pausa_tras_limpiar_s;S.score+=P.puntuacion.por_oleada+(S.waveDamage==0?P.puntuacion.sin_dano_en_oleada:0);S.banner={txt:u("cleared"),t:1.5};}}
 if(S.clearT){S.clearT-=dt;if(S.clearT<=0){S.clearT=0;startWave(S.wave+1);}}}
// ---------- combat
function playerHit(dmg,src){const p=S.p;if(S.mode!="play")return;if(p.inv>0||p.veilT>0||p.ramT>0)return;
 if(DIFF.escudo_automatico&&p.shieldT<=0&&p.shieldCd<=0)doShield();
 if(p.shieldT>0)dmg*=1-st().shieldRed;
 const vl=lvData("velo_de_bruma");
 if(vl&&p.veilCd<=0&&p.hp-dmg<p.maxHp*vl.umbral_vida){p.veilT=S.boss?vl.duracion_con_jefe_s:vl.duracion_s;p.veilAnchor={x:p.x,y:p.y};S.log.veil++;floatT(p.x,p.y-4,t("combat.veil","VELO DE BRUMA"),"#E6F0FF",1.4);return;}
 p.hp-=dmg;S.dmgTaken+=dmg;S.log.perWave=S.log.perWave||{};S.log.perWave[S.wave]=(S.log.perWave[S.wave]||0)+dmg;S.waveDamage+=dmg;S.log.dmg+=dmg;S.shake=Math.max(S.shake,.15);floatT(p.x+rnd(-2,2),p.y-3,"-"+Math.round(dmg),"#ff5555",.7);
 if(p.hp<=0){p.hp=0;S.mode="dead";S.deadT=0;taps=[];burst(p.x,p.y,"#ffa040",40);}}
function enemyHit(e,dmg,crit){if(e.ethereal)return;if(e.seg){if(e.sub||e.b.dead)return;e.hitFlash=.08;dmg*=e.b.d.cuerpo.dano_a_segmento_x;S.log.segHits=(S.log.segHits||0)+1;e=e.b;}if(e.immune){if(Math.random()<.1)floatT(e.x,e.y-3,lang=='es'?'INMUNE':'IMMUNE','#aab',.5);return;}if(e==S.boss&&e.armorT>0)dmg*=1-DIFF.jefe_v3.blindaje.reduccion;let ar=(e.d.armadura||0);dmg=Math.max(1,dmg-ar);e.hp-=dmg;e.hitFlash=.08;S.log.hits++;if(RM&&!(S.mis.length))chargeMissiles(dmg/100*RM.carga.por_100_dano);floatT(e.x+rnd(-1.5,1.5),e.y-2,(crit?"¡":"")+Math.round(dmg),crit?"#ffb020":"#fff",crit?.8:.5,crit?1.4:1);
 if(e.type=="brulote"&&e.hp<=0){explode(e,true);}
 if(e.type=="lancha"&&e.hp<e.max*.5&&!e.fled){e.fled=1;e.flee=2;}
 if(e.hp<=0)kill(e);}
function kill(e){if(e.dead)return;e.dead=1;S.kills++;if(RM)chargeMissiles(e==S.boss?0:RM.carga.por_hundido);burst(e.x,e.y,e==S.boss?"#ff7a20":"#ffaa55",e==S.boss?60:16);
 const n=e==S.boss?8:(e.d.orbes||1);for(let i=0;i<n;i++)S.orbs.push({x:e.x+rnd(-1.5,1.5),y:e.y+rnd(-1.5,1.5),v:0,val:(e.d.almas||25)/n,k:"soul",c:["#ff6a1a","#39e0ff","#8a4dff","#ffd84a"][Math.floor(Math.random()*4)]});
 for(let i=0;i<(e.d.monedas||1);i+=e==S.boss?5:1)S.orbs.push({x:e.x+rnd(-2,2),y:e.y+rnd(-2,2),v:0,val:e==S.boss?5:1,k:"coin"});
 if(e==S.boss){S.score+=P.puntuacion.jefe;S.boss=null;S.log.bossKilled=S.log.bossKilled||{};S.log.bossKilled[e.type]=Math.round(S.time);for(const o of S.en)if(o!=e&&!o.dead){o.hp=0;o.dead=1;burst(o.x,o.y,'#ffaa55',8);}
  if(e.type=='kraken')setTimeout0(()=>endRun(true),2.5);else{S.clearT=P.pausa_tras_limpiar_s+1;S.banner={txt:u('cleared'),t:2};}}}
function explode(e,byDeath){if(e.exploded)return;e.exploded=1;const r=e.d.radio_explosion;burst(e.x,e.y,"#ff5a10",30);S.zones.push({x:e.x,y:e.y,r,t:.3,max:.3,fx:1});
 if(D(e,S.p)<r)playerHit(e.d.dano_explosion);for(const o of S.en)if(o!=e&&!o.dead&&D(o,e)<r)enemyHit(o,e.d.dano_a_enemigos);e.hp=0;if(!byDeath){e.dead=1;}else kill(e);}
function eShoot(e,a,dmg,spd,life){S.eb.push({x:e.x+Math.cos(a)*(e.r||e.d.radius),y:e.y+Math.sin(a)*(e.r||e.d.radius),vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,dmg,life:life||E.comun.projectileLifetime*1.4,r:.6});}
function targetPos(){const p=S.p;return p.veilT>0?p.veilAnchor:p;}
function doShield(){const p=S.p;if(p.shieldCd>0||p.shieldT>0||S.mode!="play")return;p.shieldT=st().shieldDur;p.shieldCd=J.shieldCooldown;floatT(p.x,p.y-4,t("hud.shield","ESCUDO"),"#7fd8ff",.9);}
function doRam(){const p=S.p;if(p.ramCd>0||S.mode!="play")return;if(p.grabT>0){p.grabT=0;floatT(p.x,p.y-5,lang=='es'?'¡LIBRE!':'FREE!','#7fff9a',1);}p.ramT=J.ramDuration;p.ramCd=J.ramCooldown;p.ramDir=p.a;p.hitIds=new Set();if(p.veilT>0)p.veilT=0.0001;}
function burst(x,y,c,n){for(let i=0;i<n;i++){const a=rnd(0,7),s=rnd(4,22);S.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,t:rnd(.3,.8),max:.8,c});}}
function floatT(x,y,s,c,tm,sz){if(S.txt.length>40)S.txt.shift();S.txt.push({x,y,s,c,t:tm||.6,max:tm||.6,sz:sz||1});}
function needXP(){const a=J.subida_de_nivel.umbrales_acumulados;return a[S.lvl-1]||a[a.length-1]+(S.lvl-a.length)*J.subida_de_nivel.incremento_por_nivel*10;}
function levelUp(){S.lvl++;const p=S.p;p.maxHp+=J.subida_de_nivel.vida_max_por_nivel;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*J.subida_de_nivel.cura_al_subir);floatT(p.x,p.y-5,t("hud.level_up","¡NIVEL {n}!").replace("{n}",S.lvl),"#ffd84a",1.2,1.3);S.offer=makeOffer();S.mode="cards";taps=[];}
function makeOffer(){const pool=CARDS.filter(c=>lvOf(c.id)<c.niveles_max);const out=[];
 if(S.forceVeil&&!lvOf("velo_de_bruma")){const v=pool.find(c=>c.id=="velo_de_bruma");if(v)out.push(v);S.forceVeil=false;}
 while(out.length<C.opciones_por_subida&&out.length<pool.length){let tot=0;const cand=pool.filter(c=>!out.includes(c));for(const c of cand)tot+=C.rareza_peso[c.rareza];let r=Math.random()*tot;for(const c of cand){r-=C.rareza_peso[c.rareza];if(r<=0){out.push(c);break;}}}
 return out.sort(()=>Math.random()-.5);}
function pickCard(i){const c=S.offer&&S.offer[i];if(!c)return;S.cards[c.id]=lvOf(c.id)+1;const d=lvData(c.id);if(d&&d.maxHealth_mas){const prev=c.niveles[S.cards[c.id]-2];S.p.maxHp+=d.maxHealth_mas-(prev?prev.maxHealth_mas:0);S.p.hp=Math.min(S.p.maxHp,S.p.hp+(d.curar_al_elegir||0));}
 S.offer=null;S.mode="play";if(S.souls>=needXP())levelUp();}
function endRun(win){if(S.mode=="results")return;S.mode="results";localStorage.setItem("gk_played","1");if(win)S.score+=Math.max(0,300-Math.floor(S.time))*P.puntuacion.bono_tiempo_s_por_debajo_de_300;S.result={win,score:Math.round(S.score)};taps=[];}
function revive(){const p=S.p;S.revived=true;p.hp=p.maxHp*P.revivir.vida;p.inv=J.invulnerable_tras_revivir_s;S.mode="play";for(const b of S.eb)b.life=0;for(const e of S.en)if(D(e,p)<12&&e!=S.boss){const a=ang(p,e);e.x=p.x+Math.cos(a)*14;e.y=p.y+Math.sin(a)*14;}}
// ---------- update
function update(dt){if(S.mode=="watch"){S.watchT-=dt;if(S.watchT<=0)revive();return;}if(S.mode!="play")return;S.time+=dt;const p=S.p,s=st();
 for(const tm of timers)tm.t-=dt;const due=timers.filter(x=>x.t<=0);timers=timers.filter(x=>x.t>0);due.forEach(x=>x.f());
 // movement (absolute steering)
 const c=steer();let tv=0;if(c){const ta=Math.atan2(c.y,c.x),da=angDiff(p.a,ta),mt=s.turn*Math.PI/180*dt*(joy?SENS[sens].giro_x:1.6);p.a+=Math.max(-mt,Math.min(mt,da));tv=s.spd*c.m*(Math.abs(da)>2.2?.5:1);}
 if(p.v<tv)p.v=Math.min(tv,p.v+s.acc*dt);else p.v=Math.max(tv,p.v-J.deceleration*dt);
 if(p.ramT>0){p.ramT-=dt;const rs=J.ramDistance/J.ramDuration;p.x+=Math.cos(p.ramDir)*rs*dt;p.y+=Math.sin(p.ramDir)*rs*dt;for(const e of S.en)if(!e.dead&&!p.hitIds.has(e.id)&&D(e,p)<(e.r||e.d.radius)+J.radius+1){p.hitIds.add(e.id);enemyHit(e,J.ramDamage*(e.d.dano_embestida_x||1));}}
 else{p.x+=Math.cos(p.a)*p.v*dt;p.y+=Math.sin(p.a)*p.v*dt;}
 p.barrelFlash=Math.max(0,(p.barrelFlash||0)-dt);p.muzzle=Math.max(0,(p.muzzle||0)-dt);for(const k of["inv","shieldT","shieldCd","ramCd","ambush"])p[k]=Math.max(0,p[k]-dt);
 if(p.veilT>0){p.veilT-=dt;if(p.veilT<=0){p.veilT=0;const vl=lvData("velo_de_bruma");p.veilCd=vl.recarga_s;p.ambush=VEL.niveles?B.velo_de_bruma.emboscada.ventana_s:3;}}else p.veilCd=Math.max(0,p.veilCd-dt);
 if(s.regen)p.hp=Math.min(p.maxHp,p.hp+s.regen*dt);
 // cannon: magazine
 p.tgtT-=dt;if(p.tgtT<=0||!p.tgt||p.tgt.dead){p.tgtT=AF.cambiar_objetivo_cada_s;let best=null,bd=1e9;for(const e of S.en){if(e.dead||e.seg)continue;const d=D(e,p);const on=Math.abs(e.x-S.cam.x)<54&&Math.abs(e.y-S.cam.y)<25;if(d>AF.alcance_u||(!on&&d>35))continue;let sc=d;if(e.type=="brulote"&&d<20)sc-=100;if(sc<bd){bd=sc;best=e;}}p.tgt=best;}
 if(p.reload>0){p.reload-=dt;if(p.reload<=0)p.mag=s.mag;}
 else{p.shotT-=dt;if(p.tgt&&p.shotT<=0&&p.mag>0){fire(s);p.mag--;p.shotT=s.int;if(p.mag<=0)p.reload=s.rel;}}
 if(p.mag>s.mag)p.mag=s.mag;
 // bullets
 for(const b of S.bul){if(b.tg&&!b.tg.dead){const sp=Math.hypot(b.vx,b.vy),ca=Math.atan2(b.vy,b.vx),da=angDiff(ca,ang(b,b.tg)),mx=DIFF.asistencia_punteria_grados_s*Math.PI/180*dt,na=ca+Math.max(-mx,Math.min(mx,da));b.vx=Math.cos(na)*sp;b.vy=Math.sin(na)*sp;}b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;for(const e of S.en){if(e.dead||b.life<=0||e.sub)continue;if(!b.hit.has(e.id)&&D(b,e)<(e.r||e.d.radius)+.5){b.hit.add(e.id);enemyHit(e,b.dmg,b.crit);if(b.pierce>0){b.pierce--;b.dmg*=b.pierceX;b.tg=null;}else b.life=0;}}}
 S.bul=S.bul.filter(b=>b.life>0);
 for(const b of S.eb){if(b.home>0){b.home-=dt;const sp=Math.hypot(b.vx,b.vy),ca=Math.atan2(b.vy,b.vx),da=angDiff(ca,ang(b,targetPos())),mx=2.2*dt,na=ca+Math.max(-mx,Math.min(mx,da));b.vx=Math.cos(na)*sp;b.vy=Math.sin(na)*sp;}b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life>0&&D(b,p)<J.radius*.8+b.r){if(p.veilT>0)continue;playerHit(b.dmg);if(!(p.inv>0))b.life=0;}}
 S.eb=S.eb.filter(b=>b.life>0);
 // enemies
 tacticsTick(dt);krakenTick(dt);missilesTick(dt);
 for(const e of S.en){if(e.dead)continue;e.hitFlash-=dt;if(e.type=='kraken'){krakenAI(e,dt);continue;}if(e.type=='tentaculo'){tentAI(e,dt);continue;}if(e.seg)continue;if(e==S.boss){bossAI(e,dt);if(e.segs)serpTick(e,dt);continue;}aiEnemy(e,dt);
  if(D(e,p)<e.d.radius+J.radius&&e.type!="brulote"){p.contactT-=dt;if(p.contactT<=0){p.contactT=.5;playerHit(E.comun.contactDamageToPlayer*DIFF.dano_enemigos_x*(e.type=="bastion"?2:1));}const a=ang(e,p);p.x+=Math.cos(a)*6*dt;p.y+=Math.sin(a)*6*dt;}}
 wingsTick(dt);
 // separation
 for(let i=0;i<S.en.length;i++)for(let j=i+1;j<S.en.length;j++){const a=S.en[i],b=S.en[j];if(a.seg||b.seg)continue;const r=(a.r||a.d.radius)+(b.r||b.d.radius),d=D(a,b);if(d<r&&d>0){const k=(r-d)/2/d;if(a!=S.boss){a.x-=(b.x-a.x)*k;a.y-=(b.y-a.y)*k;}if(b!=S.boss){b.x+=(b.x-a.x)*k;b.y+=(b.y-a.y)*k;}}}
 S.en=S.en.filter(e=>!e.dead);
 // zones
 for(const z of S.zones){if(z.slam)continue;if(z.ink){z.t-=dt;continue;}if(z.mine){z.t-=dt;z.arm-=dt;if(z.arm<=0&&D(z,p)<z.r){z.t=0;burst(z.x,z.y,'#b080ff',20);S.zones.push({x:z.x,y:z.y,r:z.rx,t:.3,max:.3,fx:1});if(D(z,p)<z.rx)playerHit(z.dmg);}for(const b of S.bul)if(b.life>0&&D(b,z)<1.2){b.life=0;z.t=0;burst(z.x,z.y,'#b080ff',8);}continue;}z.t-=dt;if(z.warn>0){z.warn-=dt;if(z.warn<=0){burst(z.x,z.y,"#ff8030",14);if(D(z,p)<z.r)playerHit(z.dmg);z.t=0;}}else if(z.dps&&D(z,p)<z.r){z.tick=(z.tick||0)-dt;if(z.tick<=0){z.tick=1;playerHit(z.dps);}}}
 S.zones=S.zones.filter(z=>z.t>0||z.warn>0);for(const z of S.zones)if(z.slam&&z.warn<=0)z.t=0;
 // orbs
 for(const o of S.orbs){const d=D(o,p);if(d<s.magnet){o.v=Math.min(ORB.maxFlySpeed,Math.max(o.v,ORB.flySpeed)+ORB.flyAcceleration*dt);const a=ang(o,p);o.x+=Math.cos(a)*o.v*dt;o.y+=Math.sin(a)*o.v*dt;}
  if(d<ORB.collectDistance+J.radius*.5){o.got=1;if(o.k=="coin")S.coins+=o.val;else{S.souls+=o.val;S.soulsTot+=o.val;if(RM)chargeMissiles(o.val/10*RM.carga.por_10_almas);S.score+=o.val*P.puntuacion.por_alma;}}}
 S.orbs=S.orbs.filter(o=>!o.got);
 for(const f of S.fx){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.92;f.vy*=.92;f.t-=dt;}S.fx=S.fx.filter(f=>f.t>0);
 for(const x of S.txt){x.t-=dt;x.y-=dt*3;}S.txt=S.txt.filter(x=>x.t>0);
 if(S.banner){S.banner.t-=dt;if(S.banner.t<=0)S.banner=null;}
 S.shake=Math.max(0,S.shake-dt);
 // camera lead
 const lx=p.x+Math.cos(p.a)*p.v*.45,ly=p.y+Math.sin(p.a)*p.v*.3;S.cam.x+=(lx-S.cam.x)*Math.min(1,dt*3);S.cam.y+=(ly-S.cam.y)*Math.min(1,dt*3);
 waveLogic(dt);if(S.mode=="play"&&S.souls>=needXP())levelUp();}
function fire(s){const p=S.p,e=p.tgt;const dist=D(e,p),tt=dist/J.cannonBallSpeed;const ax=e.x+(e.vx||0)*tt,ay=e.y+(e.vy||0)*tt;const a=Math.atan2(ay-p.y,ax-p.x);p.aim=a;
 const crit=Math.random()<s.crit,amb=p.ambush>0?B.velo_de_bruma.emboscada.dano_x:1;if(amb>1){p.ambush=0;floatT(p.x,p.y-5,t("combat.ambush","¡EMBOSCADA! ×2"),"#E6F0FF",1);}
 const L=barrelLayout(s.barrels),len=2.4*s.size*1.35,dmX=s.dmgShown/J.cannonDamage,br=Math.min(2,1+.25*Math.max(0,dmX-1)/.5);p.muzzle=.08;
 L.forEach(([oy,da],i)=>{const sc=s.size,mx=p.x+Math.cos(a)*len-Math.sin(a)*oy*sc,my=p.y+Math.sin(a)*len+Math.cos(a)*oy*sc,aa=a+da;
  const central=s.barrels==1||(s.barrels==2&&i==0)||(s.barrels==3&&i==1)||(s.barrels==4&&i==1);
  let dmg=s.dmg*s.stepX*(central?1:J.balas_por_disparo.dano_bala_extra_x)*amb;if(crit)dmg*=e==S.boss?1+(s.critX-1)*.6:s.critX;
  S.bul.push({x:mx,y:my,vx:Math.cos(aa)*J.cannonBallSpeed,vy:Math.sin(aa)*J.cannonBallSpeed,dmg,crit,life:J.projectileLifetime,amb:amb>1,tg:central?e:null,r:5*br,pierce:s.pierce||0,pierceX:s.pierceX||1,hit:new Set()});
  S.fx.push({x:mx,y:my,vx:Math.cos(aa)*8,vy:Math.sin(aa)*8,t:.1,max:.1,c:"#fff2a0",big:1});});
 S.log.shots++;S.log.bullets=(S.log.bullets||0)+L.length;S.log.lastMuzzles=L.length;}
function aiEnemy(e,dt){const p=S.p,d=e.d,sm=smart();let tp=targetPos();if(p.veilT<=0&&sm>0&&(e.cutter||e.type=="brulote"))tp=predictP(e);const dist=D(e,tp),a=ang(e,tp);let mx=0,my=0;
 if(e.tele>0){e.tele-=dt;if(e.tele<=0){const aa=aimLead(e,d.projectileSpeed);eShoot(e,aa,d.attackDamage,d.projectileSpeed);e.fireT=d.fireRate;S.log.volleyShots=(S.log.volleyShots||0)+1;}}
 if(e.type=="corsario"||e.type=="bastion"){if(sm>=AIT.rodear.desde_listo&&e.slot!==undefined&&p.veilT<=0&&!e.cutter){const R=d.preferredDistance,gx=p.x+Math.cos(e.slot)*R-e.x,gy=p.y+Math.sin(e.slot)*R-e.y,gm=Math.hypot(gx,gy)||1;mx=gx/gm*Math.min(1,gm/4);my=gy/gm*Math.min(1,gm/4);}else if(dist>d.preferredDistance||e.type=="bastion"){mx=Math.cos(a);my=Math.sin(a);}else{mx=-Math.sin(a)*.4;my=Math.cos(a)*.4;}
  e.fireT-=dt;if(e.fireT<=0&&dist<d.attackRange){e.fireT=d.fireRate;if(e.type=="bastion"){const n=d.proyectiles_por_andanada,sp=d.abanico_grados*Math.PI/180;for(let i=0;i<n;i++)eShoot(e,a-sp+sp*i,d.attackDamage,d.projectileSpeed);}else eShoot(e,aimLead(e,d.projectileSpeed),d.attackDamage,d.projectileSpeed);}}
 else if(e.type=="lancha"){e.dirT-=dt;if(e.dirT<=0){e.dirT=rnd(3,5);e.dir*=-1;}if(e.flee>0){e.flee-=dt;mx=-Math.cos(a);my=-Math.sin(a);}else{const rd=(dist-d.preferredDistance)/5;mx=Math.cos(a)*rd-Math.sin(a)*e.dir;my=Math.sin(a)*rd+Math.cos(a)*e.dir;const m=Math.hypot(mx,my);mx/=m;my/=m;}
  e.fireT-=dt;if(e.fireT<=0&&dist<d.attackRange){e.fireT=d.fireRate;eShoot(e,aimLead(e,d.projectileSpeed),d.attackDamage,d.projectileSpeed);}}
 else if(e.type=="ojo"){const dp=D(e,p);if(dp<d.distancia_huida){mx=-Math.cos(a);my=-Math.sin(a);e.mvx=d.velocidad_huida/d.moveSpeed;}else{const side=e.x<p.x?-1:1,gx=p.x+side*d.preferredDistance*.9-e.x,gy=p.y-e.y,gm=Math.hypot(gx,gy)||1;mx=gx/gm*Math.min(1,gm/6);my=gy/gm*Math.min(1,gm/6);}
  if(e.aim>0){e.aim-=dt;mx=my=0;if(e.aim<=0){eShoot(e,e.aimA,d.attackDamage,d.projectileSpeed,1);e.fireT=d.fireRate;}}else{e.fireT-=dt;if(e.fireT<=0&&dp<d.attackRange&&p.veilT<=0){e.aim=d.aviso_laser_s;e.aimA=aimLead(e,d.projectileSpeed);}}}
 else if(e.type=="sembrador"){const gx=p.x+Math.cos(S.time*.4+e.id*6)*d.preferredDistance-e.x,gy=p.y+Math.sin(S.time*.4+e.id*6)*d.preferredDistance*.6-e.y,gm=Math.hypot(gx,gy)||1;mx=gx/gm;my=gy/gm;
  e.mineT=(e.mineT??2)-dt;const M=d.mina;if(e.mineT<=0&&S.zones.filter(z=>z.mine).length<M.max_vivas){e.mineT=M.cada_s;S.zones.push({x:e.x,y:e.y,r:M.radio_activacion,mine:1,arm:M.armado_s,t:M.vida_s,max:M.vida_s,dmg:M.dano*DIFF.dano_enemigos_x,rx:M.radio_explosion});}}
 else if(e.type=="brulote"){if(e.fuse<0){mx=Math.cos(a);my=Math.sin(a);if(D(e,p)<d.radio_activacion&&p.veilT<=0)e.fuse=d.mecha_s;}else{e.fuse-=dt;if(e.fuse<=0)explode(e,false);}}
 if(e.dodgeDelay>0){e.dodgeDelay-=dt;if(e.dodgeDelay<=0)e.dodgeT=AIT.esquivar.dura_s;}if(e.dodgeT>0){e.dodgeT-=dt;mx=e.dodgeDir.x*AIT.esquivar.velocidad_x;my=e.dodgeDir.y*AIT.esquivar.velocidad_x;}
 const sp=d.moveSpeed*(e.fuse>=0?.2:1)*(e.mvx||1);e.mvx=0;e.vx=mx*sp;e.vy=my*sp;e.x+=e.vx*dt;e.y+=e.vy*dt;if(mx||my)e.a=Math.atan2(my,mx);
 if(D(e,p)>140&&e.type!="boss"){const q=spawnPos();e.x=q.x;e.y=q.y;}}
function bossAI(b,dt){const L=b.d,p=S.p,tp=targetPos(),V3=DIFF.jefe_v3;
 if(!b.furia&&b.hp/b.max<=V3.furia_desde){b.furia=1;b.atk={};floatT(b.x,b.y-9,lang=="es"?"¡FURIA FINAL!":"FINAL FURY!","#ff3020",1.8,1.6);S.shake=.3;}
 if(!b.enraged&&S.time-b.born>V3.enfado.tras_s){b.enraged=1;floatT(b.x,b.y-11,lang=="es"?"¡ENFURECIDO!":"ENRAGED!","#ff2020",1.8,1.5);}
 b.armorT=Math.max(0,(b.armorT||0)-dt);b.armorCd=(b.armorCd??V3.blindaje.cada_s)-dt;if(b.armorCd<=0){b.armorCd=V3.blindaje.cada_s;b.armorT=V3.blindaje.dura_s;floatT(b.x,b.y-8,lang=="es"?"BLINDADO":"ARMORED","#c0c8d0",1);}
 if(b.furia){const F3=V3.furia;b.sumT=(b.sumT??3)-dt;if(b.sumT<=0){b.sumT=F3.invocar.cada_s;for(const k in F3.invocar)if(k!="cada_s")for(let i=0;i<F3.invocar[k];i++)spawn(k,{x:b.x+rnd(-7,7),y:b.y+rnd(-7,7)});}
  if(b.chargeT>0){b.chargeT-=dt;b.x+=Math.cos(b.chargeA)*F3.carga.velocidad*dt;b.y+=Math.sin(b.chargeA)*F3.carga.velocidad*dt;if(D(b,p)<b.r+J.radius&&!b.chargeHit){b.chargeHit=1;playerHit(F3.carga.dano);}return;}
  if(b.chargeWarn>0){b.chargeWarn-=dt;if(b.chargeWarn<=0){b.chargeT=F3.carga.dura_s;b.chargeHit=0;}return;}
  b.chgCd=(b.chgCd??2)-dt;if(b.chgCd<=0){b.chgCd=F3.carga.cada_s*(b.enraged?.7:1);b.chargeWarn=F3.carga.aviso_s;const q=predictP(b);b.chargeA=Math.atan2(q.y-b.y,q.x-b.x);return;}}const ph=b.hp/b.max<=L.fases[1].desde_vida?1:0;if(ph!=b.phase){b.phase=ph;b.atk={};floatT(b.x,b.y-8,lang=="es"?"¡FURIA!":"ENRAGED!","#ff5030",1.5,1.5);}
 if(ph==1&&!b.escort){b.escort=1;for(let i=0;i<P.oleadas_tabla[5].escolta_al_50.corsario;i++)spawn("corsario");}
 const F=L.fases[ph],spd=(F.moveSpeed||L.moveSpeed)*DIFF.jefe_velocidad_x,a=ang(b,tp),dist=D(b,tp);if(dist>12){b.vx=Math.cos(a)*spd;b.vy=Math.sin(a)*spd;}else{b.vx=-Math.sin(a)*spd;b.vy=Math.cos(a)*spd;}if(L.cuerpo){const O=L.cuerpo.ondulacion,wv=O.amplitud_rad*Math.sin(S.time*Math.PI*2*O.frecuencia_hz),c=Math.cos(wv),s_=Math.sin(wv),vx=b.vx*c-b.vy*s_,vy=b.vx*s_+b.vy*c;b.vx=vx;b.vy=vy;}b.x+=b.vx*dt;b.y+=b.vy*dt;b.a=Math.atan2(b.vy,b.vx);
 const at=L.fases[0].ataques.concat(ph?F.ataques:[]).filter((x,i,arr)=>arr.findIndex(y=>y.id==x.id)==arr.lastIndexOf(arr.find(y=>y.id==x.id))||true);
 const used=new Set();for(const k of(ph?F.ataques:L.fases[0].ataques).concat(ph?L.fases[0].ataques.filter(x=>x.id=="estela_fuego"):[])){if(used.has(k.id))continue;used.add(k.id);const base=L.fases[0].ataques.find(x=>x.id==k.id)||{};const A=Object.assign({},base,k);A.cada_s*=DIFF.jefe_ataques_cada_x*(b.enraged?DIFF.jefe_v3.enfado.cadencia_x:1);if(b.furia){const FF=DIFF.jefe_v3.furia;if(k.id=='andanada')Object.assign(A,FF.andanada,{cada_s:FF.andanada.cada_s*(b.enraged?.7:1)});if(k.id=='lluvia_brasas'){A.circulos=FF.brasas.circulos;A.aviso_s=FF.brasas.aviso_s;A.cada_s=FF.brasas.cada_s;}if(k.id=='invocar')continue;}A.dano=(A.dano||0)*DIFF.jefe_dano_x;if(A.dano_s)A.dano_s*=DIFF.jefe_dano_x;
  b.atk[k.id]=(b.atk[k.id]??A.cada_s*.6)-dt;if(b.atk[k.id]>0)continue;b.atk[k.id]=A.cada_s;
  if(k.id=="andanada"){const n=A.proyectiles,sp=A.abanico_grados*Math.PI/180;const aj=ang(b,p);for(let i=0;i<n;i++)eShoot(b,aj-sp/2+sp*i/(n-1),A.dano,A.velocidad,2.2);}
  else if(k.id=="estela_fuego"){const sq=b.segs?b.segs[(b.fz=((b.fz||0)+4)%b.segs.length)]:null;S.zones.push({x:sq?sq.x:b.x-Math.cos(b.a)*b.r,y:sq?sq.y:b.y-Math.sin(b.a)*b.r,r:A.radio,t:A.dura_s,max:A.dura_s,dps:A.dano_s,fire:1});}
  else if(k.id=="lluvia_brasas")for(let i=0;i<A.circulos;i++){const q=Math.random()*7,rr=Math.sqrt(Math.random());S.zones.push({x:tp.x+Math.cos(q)*16*rr,y:tp.y+Math.sin(q)*11*rr,r:A.radio,warn:A.aviso_s,max:A.aviso_s,dmg:A.dano,t:0});}
  else if(k.id=="invocar")for(let i=0;i<A.cantidad;i++)spawn(A.enemigo,{x:b.x+rnd(-6,6),y:b.y+rnd(-6,6)});}
 if(D(b,p)<b.r+J.radius){p.contactT-=dt;if(p.contactT<=0){p.contactT=.5;playerHit(L.dano_contacto*DIFF.jefe_dano_x);}}}

// ===== KRAKEN DE LA GRIETA (oleada 10, jefe final; balance.jefes.kraken) =====
const KR_PROTO={vida_x:1.7,dano_x:1.15,tentaculo_vida_x:1.2,deriva_u_s:3}; // capa del prototipo (más duro que el Leviatán)
function mkTent(k,i,n){const T=k.d.tentaculos;const a=i/n*Math.PI*2+rnd(-.2,.2);const hp=T.health*KR_PROTO.tentaculo_vida_x;return{type:"tentaculo",k,ang:a,x:k.x+Math.cos(a)*T.radio_anillo,y:k.y+Math.sin(a)*T.radio_anillo,hp,max:hp,d:{radius:2.6,almas:40,monedas:3,orbes:1},id:Math.random(),hitFlash:0,slamT:rnd(1,T.golpe.cada_s)};}
function spawnKraken(){const K=B.jefes.kraken,p=S.p;const hp=K.health*KR_PROTO.vida_x;const k={type:"kraken",x:p.x+Math.cos(p.a)*30,y:p.y+Math.sin(p.a)*30,a:0,hp,max:hp,d:K,r:K.radius,phase:1,immune:true,id:Math.random(),hitFlash:0,born:S.time,t:{},killedT:0};
 S.boss=k;S.en.push(k);for(let i=0;i<K.tentaculos.cantidad;i++)S.en.push(mkTent(k,i,K.tentaculos.cantidad));S.log.bossSeen=true;S.log.krakenSeen=Math.round(S.time);}
function tentAI(e,dt){const k=e.k,T=k.d.tentaculos,p=S.p;if(k.dead){e.dead=1;return;}e.ang+=dt*.15;e.x=k.x+Math.cos(e.ang)*T.radio_anillo;e.y=k.y+Math.sin(e.ang)*T.radio_anillo;
 const fx=k.phase>=3?1/k.d.fases[2].velocidad_ataques_x:1;e.slamT-=dt;if(e.slamT<=0){e.slamT=T.golpe.cada_s*fx*(1+rnd(0,.3))*1.0;const tp=targetPos();
  S.zones.push({slam:1,x:e.x,y:e.y,a:ang(e,tp),len:T.golpe.largo,w:T.golpe.ancho*1.6,warn:T.golpe.aviso_s,max:T.golpe.aviso_s,t:0,dmg:T.golpe.dano*KR_PROTO.dano_x});}}
function krakenTick(dt){for(const z of S.zones){if(z.slam&&z.warn>0){z.warn-=dt;if(z.warn<=0){const p=S.p,dx=p.x-z.x,dy=p.y-z.y,al=dx*Math.cos(z.a)+dy*Math.sin(z.a),pe=Math.abs(-dx*Math.sin(z.a)+dy*Math.cos(z.a));
  for(let i=0;i<6;i++)burst(z.x+Math.cos(z.a)*z.len*i/6,z.y+Math.sin(z.a)*z.len*i/6,"#8a4dff",3);if(al>0&&al<z.len&&pe<z.w/2+J.radius*.6)playerHit(z.dmg);}}}}
function krakenAI(k,dt){const K=k.d,p=S.p,F2=K.fases[1].ataques,F3=K.fases[2];const tents=S.en.filter(e=>e.type=="tentaculo"&&!e.dead);
 const a=ang(k,p),dd=D(k,p);if(dd>20){k.x+=Math.cos(a)*KR_PROTO.deriva_u_s*dt;k.y+=Math.sin(a)*KR_PROTO.deriva_u_s*dt;}
 if(k.phase==1){k.killedT=K.tentaculos.cantidad-tents.length;if(k.killedT>=K.fases[0].cuerpo_inmune_hasta_tentaculos_muertos){k.phase=2;k.immune=false;S.banner={txt:lang=="es"?"¡EL KRAKEN EMERGE!":"THE KRAKEN SURFACES!",t:2,boss:1};S.shake=.4;}return;}
 if(k.phase==2&&k.hp/k.max<F3.desde_vida){k.phase=3;floatT(k.x,k.y-11,lang=="es"?"¡FURIA DEL ABISMO!":"ABYSSAL FURY!","#ff3020",1.8,1.6);S.shake=.3;}
 const fx=k.phase>=3?1/F3.velocidad_ataques_x:1,T=k.t;const A=id=>F2.find(x=>x.id==id);
 // tinta
 T.ink=(T.ink??4)-dt;if(T.ink<=0){const I=A("tinta");T.ink=I.cada_s*fx;S.zones.push({ink:1,x:p.x+rnd(-4,4),y:p.y+rnd(-4,4),r:I.radio,t:I.dura_s,max:I.dura_s});}
 // remolino central
 const R=A("remolino_central");if(dd<R.radio&&p.ramT<=0){const f=R.fuerza*(1-dd/R.radio)*.6;p.x-=Math.cos(a)*f*dt;p.y-=Math.sin(a)*f*dt;}
 // orbes abisales
 const O=A("orbes_abisales");T.orb=(T.orb??2)-dt;if(T.orb<=0){T.orb=O.cada_s*fx;for(let i=0;i<O.cantidad;i++){const aa=a+(i-1)*.6;S.eb.push({x:k.x+Math.cos(aa)*k.r,y:k.y+Math.sin(aa)*k.r,vx:Math.cos(aa)*O.velocidad,vy:Math.sin(aa)*O.velocidad,dmg:O.dano*KR_PROTO.dano_x,life:5,r:1,home:O.teledirigidos_s,orb:1});}}
 // regenerar tentáculos
 const RG=K.tentaculos.regenerar;T.rg=(T.rg??RG.cada_s)-dt;if(T.rg<=0){T.rg=RG.cada_s;for(let i=0;i<RG.cantidad&&S.en.filter(e=>e.type=="tentaculo"&&!e.dead).length<K.tentaculos.cantidad;i++)S.en.push(mkTent(k,Math.random()*4,4));floatT(k.x,k.y-10,lang=="es"?"¡Le crecen tentáculos!":"Tentacles regrow!","#b080ff",1.2);}
 // agarre (fase 3)
 if(k.phase>=3){const G=F3.ataques.find(x=>x.id=="agarre");if(p.grabT>0){p.grabT-=dt;p.x+= (k.x-p.x)*dt*.5;p.y+=(k.y-p.y)*dt*.5;T.gd=(T.gd||0)-dt;if(T.gd<=0){T.gd=.5;playerHit(G.dano_s*.5*KR_PROTO.dano_x);}}
  else if(dd<G.distancia+k.r){k.grabWarn=(k.grabWarn||0)+dt;if(k.grabWarn>=G.aviso_s){k.grabWarn=0;p.grabT=G.dura_s;floatT(p.x,p.y-5,lang=="es"?"¡ATRAPADO! ⚡ para soltarte":"GRABBED! ⚡ to break free","#ff5050",1.5);}}else k.grabWarn=Math.max(0,(k.grabWarn||0)-dt);}
 if(D(k,p)<k.r+J.radius){p.contactT-=dt;if(p.contactT<=0){p.contactT=.5;playerHit(50);}}}
function drawKraken(e,x,y){const r=e.r*PX;g.save();g.translate(x,y);if(e.immune){g.globalAlpha=.45;}
 g.rotate(Math.sin(S.time*.5)*.08);if(!spr("kraken",r*2.3,r*2.3)){g.fillStyle="#2a1040";g.beginPath();g.arc(0,0,r,0,7);g.fill();}sprFlash("kraken",r*2.3,r*2.3,e.hitFlash);if(e.phase>=3){g.strokeStyle="rgba(255,48,80,"+(.5+.3*Math.sin(S.time*6))+")";g.lineWidth=4;g.beginPath();g.arc(0,0,r*1.08,0,7);g.stroke();}g.rotate(-Math.sin(S.time*.5)*.08);

 if(e.grabWarn>0){g.strokeStyle="rgba(255,40,40,"+(.3+.6*e.grabWarn/1.5)+")";g.lineWidth=3;g.setLineDash([8,6]);g.beginPath();g.arc(0,0,(10+e.r)*PX,0,7);g.stroke();g.setLineDash([]);}
 g.restore();}
function drawTent(e,x,y){const k=e.k,kx=wx(k.x),ky=wy(k.y),an=Math.atan2(y-ky,x-kx),len=Math.hypot(x-kx,y-ky)+e.d.radius*PX*1.6;
 g.save();g.translate(kx,ky);g.rotate(an+Math.sin(S.time*2+e.ang*3)*.06);const th=e.d.radius*PX*2.2;
 if(ok("tentaculo")){g.drawImage(IMG.tentaculo,k.r*PX*.55,-th/2,len-k.r*PX*.55,th);if(e.hitFlash>0){g.globalCompositeOperation="lighter";g.globalAlpha=.6;g.drawImage(IMG.tentaculo,k.r*PX*.55,-th/2,len-k.r*PX*.55,th);}}
 else{g.strokeStyle="#5a2a7a";g.lineWidth=10;g.beginPath();g.moveTo(0,0);g.lineTo(len,0);g.stroke();}g.restore();}
// ===== RÁFAGA DE MISILES (poder especial; balance.rafaga_misiles) =====
const RM=B.rafaga_misiles;
function chargeMissiles(pct){if(!RM)return;const p=S.p;if(p.rm>=100)return;p.rm=Math.min(100,(p.rm||0)+pct*(1+(st().rmCharge||0)));if(p.rm>=100){floatT(p.x,p.y-6,t("power.missiles.ready","¡RÁFAGA LISTA!"),"#ffb020",1.4);}}
function fireMissiles(){const p=S.p;if(!RM||S.mode!="play"||(p.rm||0)<100)return;const alive=S.en.filter(e=>!e.dead&&!e.immune&&!e.seg);if(!alive.length&&!S.en.length)return;p.rm=0;S.log.rmUses=(S.log.rmUses||0)+1;
 const n=RM.misiles+(st().rmExtra||0),slots=[];const pool=alive.length?alive:S.en;
 for(const e of pool){const w=(e==S.boss||e.type=="tentaculo")?RM.misiles_por_jefe:1;for(let i=0;i<w;i++)slots.push(e);}
 for(let i=0;i<n;i++){const tg=slots[i%slots.length],a=p.a+Math.PI+(i/n-.5)*2.6;S.mis.push({x:p.x,y:p.y,a,v:RM.velocidad_inicial,tg,life:RM.vida_s,delay:i*RM.intervalo_s});}
 floatT(p.x,p.y-6,t("power.missiles.name","Ráfaga de misiles")+"!","#ffb020",1.2,1.3);S.shake=.2;}
function missilesTick(dt){for(const m of S.mis){if(m.delay>0){m.delay-=dt;m.x=S.p.x;m.y=S.p.y;continue;}m.life-=dt;
 if(m.tg&&m.tg.dead){let b=null,bd=1e9;for(const e of S.en)if(!e.dead&&!e.immune){const d=D(e,m);if(d<bd){bd=d;b=e;}}m.tg=b;}
 if(m.tg){const da=angDiff(m.a,ang(m,m.tg)),mt=RM.giro_grados_s*Math.PI/180*dt;m.a+=Math.max(-mt,Math.min(mt,da));}m.v=Math.min(RM.velocidad_max,m.v+RM.aceleracion*dt);
 m.x+=Math.cos(m.a)*m.v*dt;m.y+=Math.sin(m.a)*m.v*dt;if(Math.random()<.7)S.fx.push({x:m.x,y:m.y,vx:rnd(-1,1),vy:rnd(-1,1),t:.5,max:.5,c:"#9aa4ad",smoke:1});
 const hitE=m.tg&&!m.tg.dead&&D(m,m.tg)<(m.tg.r||m.tg.d.radius)+.8;if(hitE||m.life<=0){m.done=1;burst(m.x,m.y,"#ffb040",14);S.zones.push({x:m.x,y:m.y,r:RM.radio_explosion,t:.25,max:.25,fx:1});
  for(const e of S.en)if(!e.dead&&!e.seg&&D(e,m)<(e.r||e.d.radius)+RM.radio_explosion){const dm=(e==m.tg?RM.dano:RM.dano_area)*(e==S.boss?RM.jefe_dano_x:1);S.log.rmHits=(S.log.rmHits||0)+1;S.log.rmTargets=S.log.rmTargets||new Set();S.log.rmTargets.add(e.id);enemyHit(e,dm);}}}
 S.mis=S.mis.filter(m=>!m.done);}
function drawMissiles(){for(const m of S.mis){if(m.delay>0)continue;g.save();g.translate(wx(m.x),wy(m.y));g.rotate(m.a);g.fillStyle="#e8e8e8";g.fillRect(-7,-2.5,14,5);g.fillStyle="#ff4020";g.fillRect(5,-2.5,4,5);g.fillStyle="#ffb020";g.beginPath();g.arc(-9,0,3+Math.random()*2,0,7);g.fill();g.restore();}}
// ---------- render
const wx=x=>(x-S.cam.x)*PX+W/2, wy=y=>(y-S.cam.y)*PX+H/2;
let wavesT=0;
function drawSerp(b){const C=b.d.cuerpo,AF2=b.d.aliento_fuego,LC=b.d.latigazo_cola;
 if(b.whipWarn>0){const q=b.whipPos,k=1-b.whipWarn/LC.aviso_s;g.fillStyle="rgba(255,40,20,"+(.15+.3*k)+")";g.strokeStyle="#ff3020";g.lineWidth=3;g.beginPath();g.arc(wx(q.x),wy(q.y),LC.radio*PX,0,7);g.fill();g.stroke();g.beginPath();g.arc(wx(q.x),wy(q.y),LC.radio*PX*k,0,7);g.stroke();}
 if(b.brWarn>0||b.brT>0){const jx=wx(b.x+Math.cos(b.brA)*b.r),jy=wy(b.y+Math.sin(b.brA)*b.r),R=AF2.alcance_u*PX,hw=AF2.cono_grados*Math.PI/360;g.save();g.translate(jx,jy);g.rotate(b.brA);g.beginPath();g.moveTo(0,0);g.arc(0,0,R,-hw,hw);g.closePath();
  if(b.brWarn>0){g.fillStyle="rgba(255,30,20,"+(.15+.3*(1-b.brWarn/AF2.aviso_s))+")";g.fill();g.strokeStyle="#ff3020";g.lineWidth=3;g.setLineDash([12,8]);g.stroke();g.setLineDash([]);}
  else{g.globalCompositeOperation="lighter";const fg=g.createRadialGradient(0,0,0,0,0,R);fg.addColorStop(0,"rgba(255,240,170,.95)");fg.addColorStop(.4,"rgba(255,140,30,.75)");fg.addColorStop(1,"rgba(255,40,0,.05)");g.fillStyle=fg;g.fill();}g.restore();}
 for(let i=b.segs.length-1;i>=0;i--){const sg=b.segs[i],x=wx(sg.x),y=wy(sg.y);if(x<-200||x>W+200||y<-200||y>H+200)continue;const dip=Math.sin(S.time*1.6-sg.i*.6);g.save();g.translate(x,y);g.rotate(sg.a);
  const k=sg.tail?"lev_cola":"lev_segmento",w=sg.tail?sg.r*PX*3.6:sg.r*PX*2.5;
  if(sg.sub){g.globalAlpha=.32;}else{g.save();g.globalAlpha=.3;g.fillStyle="#000";g.beginPath();g.ellipse(5,6,w*.5,sg.r*PX*.9,0,0,7);g.fill();g.restore();}
  g.save();if(sg.tail)g.translate(-w*.3,0);const sc=sg.sub?.88:1+.04*Math.max(0,dip);g.scale(sc,sc);if(!spr(k,w)){g.fillStyle="#2a1a14";g.beginPath();g.arc(0,0,sg.r*PX,0,7);g.fill();}sprFlash(k,w,0,sg.hitFlash);g.restore();
  if(sg.sub){g.globalAlpha=.55;g.fillStyle="rgba(10,40,60,.6)";g.beginPath();g.ellipse(0,0,w*.5,sg.r*PX*.8,0,0,7);g.fill();}
  g.globalAlpha=sg.sub?.4:.12;g.strokeStyle="rgba(210,235,255,.8)";g.lineWidth=2;g.beginPath();g.ellipse(0,0,w*.55,sg.r*PX*1.05,0,0,7);g.stroke();g.restore();}}
function drawSea(){if(!seaPat&&ok("mar"))seaPat=g.createPattern(IMG.mar,"repeat");
 if(seaPat){const ox=-(S.cam.x*PX)%512,oy=-(S.cam.y*PX)%512;g.save();g.translate(ox,oy);g.fillStyle=seaPat;g.fillRect(-512,-512,W+1024,H+1024);g.restore();
  const vg=g.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.7);vg.addColorStop(0,"rgba(0,10,20,0)");vg.addColorStop(1,"rgba(0,5,12,.55)");g.fillStyle=vg;g.fillRect(0,0,W,H);}
 else{const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,"#062a3d");gr.addColorStop(1,"#03192a");g.fillStyle=gr;g.fillRect(0,0,W,H);}
 g.strokeStyle="rgba(170,220,255,0.07)";g.lineWidth=2;const sp=6;const x0=Math.floor((S.cam.x-56)/sp)*sp,y0=Math.floor((S.cam.y-28)/sp)*sp;
 for(let y=y0;y<S.cam.y+28;y+=sp)for(let x=x0;x<S.cam.x+56;x+=sp){const h=Math.sin(x*12.9898+y*78.233)*43758.5;const r=h-Math.floor(h);if(r<.35){const ox=Math.sin(wavesT*.8+r*20)*1.2;g.beginPath();g.arc(wx(x+r*5+ox),wy(y+r*3),10+r*14,Math.PI*1.15,Math.PI*1.85);g.stroke();}}}
function shipPath(L,Wd){g.beginPath();g.moveTo(L*.55,0);g.lineTo(L*.15,-Wd*.42);g.lineTo(-L*.42,-Wd*.5);g.lineTo(-L*.5,-Wd*.2);g.lineTo(-L*.5,Wd*.2);g.lineTo(-L*.42,Wd*.5);g.lineTo(L*.15,Wd*.42);g.closePath();}
function drawPlayer(){const p=S.p,x=wx(p.x),y=wy(p.y),FS=1+.05*(form-1),L=J.length*PX*1.35*FS,Wd=FS*J.radius*PX*1.3;g.save();g.translate(x,y);
 if(p.veilT>0){g.globalAlpha=.45;for(let i=0;i<8;i++){g.fillStyle="rgba(200,216,240,.25)";g.beginPath();g.arc(-Math.cos(p.a)*(i*8)+rnd(-6,6),-Math.sin(p.a)*(i*8)+rnd(-6,6),18-i,0,7);g.fill();}g.globalAlpha=1;g.strokeStyle="rgba(230,240,255,.8)";g.lineWidth=2;g.beginPath();g.arc(0,0,L*.75,-Math.PI/2,-Math.PI/2+2*Math.PI*(p.veilT/(S.boss?lvData("velo_de_bruma").duracion_con_jefe_s:lvData("velo_de_bruma").duracion_s)));g.stroke();}
 // wake
 g.save();g.rotate(p.a);g.fillStyle="rgba(200,240,255,"+(.03+p.v/J.maxForwardSpeed*.09)+")";g.beginPath();g.moveTo(-L*.5,-Wd*.4);g.lineTo(-L*.5-p.v*2.5,-Wd*1.1);g.lineTo(-L*.5-p.v*2.5,Wd*1.1);g.lineTo(-L*.5,Wd*.4);g.fill();
 if(p.inv>0&&Math.floor(S.time*10)%2)g.globalAlpha=.4;if(p.veilT>0)g.globalAlpha=.45;
 // alas azules (formas 4-5): solo defensa (sprite)
 const wc=wingCfg();if(wc){const r0=J.radius*.55*PX,lw=wc.largo_u*PX*1.25,pul=.8+.2*Math.sin(S.time*5);g.save();g.globalAlpha*=pul;g.shadowColor="#2a8bff";g.shadowBlur=18;
  for(const sg of[-1,1]){g.save();g.translate(-L*.08,sg*r0);g.rotate(sg*(Math.PI/2+.38));g.translate(lw/2,0);if(!spr("ala",lw))0;g.restore();}g.restore();}
 // casco (sprite de la forma)
 if(!spr("forma"+form,L*1.6)){const hg=g.createLinearGradient(0,-Wd/2,0,Wd/2);hg.addColorStop(0,"#9fb2c4");hg.addColorStop(1,"#6d8296");g.fillStyle=hg;shipPath(L,Wd);g.fill();}
 if(p.veilT>0){g.strokeStyle="#E6F0FF";g.lineWidth=2;shipPath(L,Wd);g.stroke();}
 g.restore();
 // turret
 {const s2=st(),nb=s2.barrels,stp=s2.steps;if(p.nb!==undefined&&p.nb!=nb){p.barrelFlash=1;floatT(p.x,p.y-6,t("cannon.upgrade_barrels","¡CAÑÓN NUEVO! {count} cañones").replace("{count}",nb),"#ffd84a",1.2);}
 if(p.stp!==undefined&&stp>p.stp){p.barrelFlash=1;floatT(p.x,p.y-6,t("cannon.upgraded","CAÑÓN MEJORADO +{count}").replace("{count}",stp),"#ffb020",1.4);}p.nb=nb;p.stp=stp;
 g.save();g.rotate(p.aim??p.a);const K=1.35*s2.size,bc=p.ambush>0?"#E6F0FF":stp?"#b07a2a":"#8a6a2a";g.scale(K,K);
 {const rr=9+nb*1.5,tg=g.createRadialGradient(-3,-3,1,0,0,rr);tg.addColorStop(0,"#f2d58a");tg.addColorStop(.6,"#b8862f");tg.addColorStop(1,"#5a3d12");g.fillStyle=tg;g.strokeStyle="#140c04";g.lineWidth=2/K;g.beginPath();g.arc(0,0,rr,0,7);g.fill();g.stroke();g.fillStyle="#39e0ff";g.beginPath();g.arc(0,0,2.5,0,7);g.fill();}
 for(const[oy,da]of barrelLayout(nb)){g.save();g.translate(0,oy*PX);g.rotate(da);{const bg2=g.createLinearGradient(0,-3.5,0,3.5);bg2.addColorStop(0,"#e9cf8a");bg2.addColorStop(.5,bc);bg2.addColorStop(1,"#3a280c");g.fillStyle=bg2;}g.fillRect(2,-3.5,32,7);g.strokeRect(2,-3.5,32,7);g.fillStyle="#c9d6e2";g.fillRect(22,-4.2,4,8.4);g.fillStyle="#39e0ff";g.shadowColor="#39e0ff";g.shadowBlur=8;g.fillRect(31,-3.5,4,7);g.shadowBlur=0;
  if(p.muzzle>0){g.fillStyle="#fff2a0";g.beginPath();g.arc(38,0,7,0,7);g.fill();}g.restore();}
 if(p.barrelFlash>0){g.globalAlpha=p.barrelFlash;g.strokeStyle="#fff6c0";g.lineWidth=3;g.beginPath();g.arc(0,0,40-20*p.barrelFlash,0,7);g.stroke();g.globalAlpha=1;}g.restore();}
 if(p.shieldT>0){g.strokeStyle="rgba(120,210,255,.8)";g.fillStyle="rgba(80,180,255,.15)";g.lineWidth=3;g.beginPath();g.arc(0,0,L*.7,0,7);g.fill();g.stroke();}
 g.restore();}
const ECOL={ojo:"#e8e0a0",sembrador:"#6a4aa0",tentaculo:"#5a2a7a",corsario:"#b5463a",lancha:"#d9b23a",brulote:"#ff6a1a",bastion:"#5a6470"};
function drawEnemy(e){if(e.seg)return;if(e==S.boss&&e.segs)drawSerp(e);const x=wx(e.x),y=wy(e.y);if(e.type=='tentaculo'){drawTent(e,x,y);if(e.hp<e.max){g.fillStyle='#000a';g.fillRect(x-20,y-52,40,5);g.fillStyle='#c070ff';g.fillRect(x-20,y-52,40*e.hp/e.max,5);}return;}if(e.type=='kraken'){drawKraken(e,x,y);return;}if(x<-200||x>W+200||y<-200||y>H+200)return;g.save();g.translate(x,y);g.rotate(e.a||0);
 if(e==S.boss){const r=e.r*PX;if(e.chargeWarn>0){g.save();g.rotate(e.chargeA-(e.a||0));g.fillStyle="rgba(255,30,30,"+(.18+.3*(1-e.chargeWarn/DIFF.jefe_v3.furia.carga.aviso_s))+")";g.fillRect(0,-r*.8,DIFF.jefe_v3.furia.carga.velocidad*DIFF.jefe_v3.furia.carga.dura_s*PX+r,r*1.6);g.restore();}if(e.armorT>0){g.strokeStyle="#c0c8d0";g.lineWidth=5;g.beginPath();g.arc(0,0,r*1.25,0,7);g.stroke();}if(e.enraged||e.furia){g.save();g.globalCompositeOperation="lighter";g.globalAlpha=.3+.2*Math.sin(S.time*8);const eg=g.createRadialGradient(0,0,0,0,0,r*1.4);eg.addColorStop(0,"#ff6010");eg.addColorStop(1,"rgba(255,40,0,0)");g.fillStyle=eg;g.beginPath();g.arc(0,0,r*1.4,0,7);g.fill();g.restore();}if(!spr("lev_cabeza",r*2.7)){g.fillStyle="#3a1a10";g.beginPath();g.ellipse(0,0,r*1.4,r*.8,0,0,7);g.fill();}sprFlash("lev_cabeza",r*2.7,0,e.hitFlash);if(e.brT>0){g.save();g.globalCompositeOperation="lighter";g.fillStyle="rgba(255,190,60,.8)";g.beginPath();g.arc(r*1.1,0,r*.35,0,7);g.fill();g.restore();}}
 else{const r=e.d.radius*PX,SW={corsario:3.1,lancha:3.6,brulote:3.0,bastion:2.9,ojo:3.4,sembrador:3.0}[e.type]||3;
  g.save();g.globalAlpha=.35;g.fillStyle="#000";g.beginPath();g.ellipse(4,5,r*1.3,r*.6,0,0,7);g.fill();g.restore();
  if(!spr(e.type,r*SW)){g.fillStyle=ECOL[e.type];shipPath(r*2.4,r*1.5);g.fill();}sprFlash(e.type,r*SW,0,e.hitFlash);
  if(e.type=="brulote"&&e.fuse>=0&&Math.floor(S.time*12)%2){g.fillStyle="rgba(255,240,180,.7)";g.beginPath();g.arc(0,0,r*.6,0,7);g.fill();}
  if(e.type=="brulote"){if(e.fuse>=0){g.rotate(-(e.a||0));g.strokeStyle="rgba(255,60,30,.6)";g.lineWidth=2;g.beginPath();g.arc(0,0,e.d.radio_explosion*PX,0,7);g.stroke();}}}
 g.restore();if(e.aim>0){const pp=S.p;g.strokeStyle='rgba(255,40,40,.8)';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(e.aimA)*900,y+Math.sin(e.aimA)*900);g.stroke();}if(e.tele>0){const pp=S.p;g.strokeStyle="rgba(255,40,40,"+(.4+.5*(1-e.tele/AIT.descarga.aviso_s))+")";g.lineWidth=2;g.setLineDash([10,8]);g.beginPath();g.moveTo(x,y);g.lineTo(wx(pp.x),wy(pp.y));g.stroke();g.setLineDash([]);g.fillStyle="#ff3030";g.beginPath();g.arc(x,y-e.d.radius*PX-20,6,0,7);g.fill();}
 if(e!=S.boss&&e.hp<e.max){g.fillStyle="#000a";g.fillRect(x-20,y-e.d.radius*PX-12,40,5);g.fillStyle="#ff5050";g.fillRect(x-20,y-e.d.radius*PX-12,40*e.hp/e.max,5);}}
function bar(x,y,w,h,f,c,bg){f=Math.max(0,Math.min(1,f||0));g.save();g.fillStyle=bg||"rgba(4,12,20,.75)";g.beginPath();g.roundRect(x-2,y-2,w+4,h+4,h/2+2);g.fill();if(f>0){const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,"#ffffffaa");gr.addColorStop(.35,c);gr.addColorStop(1,c);g.fillStyle=gr;g.beginPath();g.roundRect(x,y,Math.max(h,w*f),h,h/2);g.fill();}g.strokeStyle="rgba(201,162,74,.85)";g.lineWidth=1.5;g.beginPath();g.roundRect(x-2,y-2,w+4,h+4,h/2+2);g.stroke();g.restore();}
function txt(s,x,y,sz,c,al,b){g.font=(b?"bold ":"")+sz+"px system-ui,Segoe UI,Arial";g.textAlign=al||"left";g.textBaseline="middle";g.lineWidth=4;g.strokeStyle="#0008";g.strokeText(s,x,y);g.fillStyle=c||"#fff";g.fillText(s,x,y);}
function render(){g.setTransform(cv.width/W,0,0,cv.height/H,0,0);const sh=S.shake>0?rnd(-4,4):0;g.save();g.translate(sh,sh);drawSea();
 for(const z of S.zones){if(z.ink)continue;if(z.mine){g.save();g.translate(wx(z.x),wy(z.y));g.rotate(S.time*.5);if(!spr('mina',30)){g.fillStyle='#6a4aa0';g.beginPath();g.arc(0,0,9,0,7);g.fill();}g.restore();if(z.arm<=0&&Math.floor(S.time*4)%2){g.fillStyle='rgba(255,60,60,.6)';g.beginPath();g.arc(wx(z.x),wy(z.y),5,0,7);g.fill();}g.strokeStyle='rgba(255,60,60,.35)';g.lineWidth=1;g.beginPath();g.arc(wx(z.x),wy(z.y),z.r*PX,0,7);g.stroke();continue;}
  if(z.slam){g.save();g.translate(wx(z.x),wy(z.y));g.rotate(z.a);g.fillStyle='rgba(255,40,30,'+(.15+.35*(1-z.warn/z.max))+')';g.fillRect(0,-z.w*PX/2,z.len*PX,z.w*PX);g.strokeStyle='#ff3020';g.lineWidth=2;g.strokeRect(0,-z.w*PX/2,z.len*PX,z.w*PX);g.restore();continue;}
  g.beginPath();g.arc(wx(z.x),wy(z.y),z.r*PX,0,7);if(z.warn>0){g.fillStyle="rgba(255,40,30,"+(.15+.25*(1-z.warn/z.max))+")";g.fill();g.strokeStyle="#ff3020";g.lineWidth=2;g.stroke();}else if(z.fire){g.fillStyle="rgba(255,110,20,"+(.35*z.t/z.max)+")";g.fill();}else{g.fillStyle="rgba(255,150,40,"+(z.t/z.max*.6)+")";g.fill();}}
 for(const o of S.orbs){const X=wx(o.x),Y=wy(o.y);if(o.k=="coin"){const cg=g.createRadialGradient(X-2,Y-2,1,X,Y,8);cg.addColorStop(0,"#fff4c0");cg.addColorStop(.5,"#ffc830");cg.addColorStop(1,"#8a5a00");g.fillStyle=cg;g.beginPath();g.arc(X,Y,7,0,7);g.fill();g.strokeStyle="#5a3a00";g.lineWidth=1.5;g.stroke();}
  else{const pu=1+.15*Math.sin(S.time*6+o.x);const sg_=g.createRadialGradient(X,Y,0,X,Y,14*pu);sg_.addColorStop(0,"#ffffff");sg_.addColorStop(.25,o.c);sg_.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=sg_;g.beginPath();g.arc(X,Y,14*pu,0,7);g.fill();}}
 for(const e of S.en)if(e.type=='kraken')drawEnemy(e);for(const e of S.en)if(e.type!='kraken')drawEnemy(e);drawMissiles();if(S.mode!="title")drawPlayer();
 for(const b of S.bul){g.save();g.globalCompositeOperation="lighter";const bR=(b.amb?7:(b.r||5))*2.2,bg3=g.createRadialGradient(wx(b.x),wy(b.y),0,wx(b.x),wy(b.y),bR);bg3.addColorStop(0,"rgba(255,240,190,.9)");bg3.addColorStop(1,"rgba(255,160,40,0)");g.fillStyle=bg3;g.beginPath();g.arc(wx(b.x),wy(b.y),bR,0,7);g.fill();g.restore();g.fillStyle=b.amb?"#E6F0FF":b.crit?"#ffb020":"#fff6d0";g.beginPath();g.arc(wx(b.x),wy(b.y),b.amb?7:(b.r||5),0,7);g.fill();if((b.r||5)>6){g.globalAlpha=.3;g.beginPath();g.arc(wx(b.x),wy(b.y),b.r*1.8,0,7);g.fill();g.globalAlpha=1;}}
 for(const b of S.eb){g.fillStyle=b.orb?"#b060ff":"#ff4040";g.shadowColor="#ff2020";g.shadowBlur=8;g.beginPath();g.arc(wx(b.x),wy(b.y),7,0,7);g.fill();}g.shadowBlur=0;
 {const inInk=S.zones.find(z=>z.ink&&D(z,S.p)<z.r);for(const z of S.zones)if(z.ink){g.fillStyle='rgba(10,0,20,'+(.55*Math.min(1,z.t))+')';g.beginPath();g.arc(wx(z.x),wy(z.y),z.r*PX,0,7);g.fill();}
 if(inInk){const gr=g.createRadialGradient(wx(S.p.x),wy(S.p.y),8*PX*.8,wx(S.p.x),wy(S.p.y),8*PX*1.3);gr.addColorStop(0,'rgba(5,0,12,0)');gr.addColorStop(1,'rgba(5,0,12,.92)');g.fillStyle=gr;g.fillRect(-20,-20,W+40,H+40);}}
 g.save();g.globalCompositeOperation='lighter';for(const f of S.fx){if(f.smoke)continue;g.globalAlpha=f.t/f.max;g.fillStyle=f.c;g.beginPath();g.arc(wx(f.x),wy(f.y),f.big?11:5,0,7);g.fill();}g.restore();
 for(const f of S.fx){if(!f.smoke)continue;g.globalAlpha=f.t/f.max;g.fillStyle=f.c;if(f.smoke){g.globalAlpha*=.6;g.beginPath();g.arc(wx(f.x),wy(f.y),4+8*(1-f.t/f.max),0,7);g.fill();}else if(f.big){g.beginPath();g.arc(wx(f.x),wy(f.y),9,0,7);g.fill();}else g.fillRect(wx(f.x)-3,wy(f.y)-3,6,6);}g.globalAlpha=1;
 for(const x of S.txt){g.globalAlpha=Math.min(1,x.t/x.max*2);txt(x.s,wx(x.x),wy(x.y),Math.round(22*x.sz),x.c,"center",1);}g.globalAlpha=1;
 // offscreen indicators
 for(const e of S.en){if(e.seg)continue;const x=wx(e.x),y=wy(e.y);if(x>0&&x<W&&y>0&&y<H)continue;const cx=Math.max(20,Math.min(W-20,x)),cy=Math.max(20,Math.min(H-20,y));g.fillStyle=e==S.boss?"#ff6a1a":e.type=="brulote"?"#ffaa00":"#ff5050aa";g.beginPath();g.arc(cx,cy,e==S.boss?12:6,0,7);g.fill();}
 g.restore();hud();
 if(S.mode=="cards")drawCards();if(S.mode=="dead"||S.mode=="watch")drawRevive();if(S.mode=="results")drawResults();if(S.mode=="title")drawTitle();}
function hud(){if(S.mode=="title")return;const p=S.p,s=st();bar(130,22,360,22,p.hp/p.maxHp,p.hp/p.maxHp<.3?"#ff4040":"#4ade80");txt(Math.ceil(p.hp)+" / "+p.maxHp,310,33,16,"#fff","center",1);
 bar(130,50,360,8,(S.souls-(J.subida_de_nivel.umbrales_acumulados[S.lvl-2]||0))/(needXP()-(J.subida_de_nivel.umbrales_acumulados[S.lvl-2]||0)),"#7c5cff");txt(u("lvlshort")+" "+S.lvl,500,54,16,"#c9b8ff","left",1);
 txt("🪙 "+S.coins,500,33,20,"#ffcc33","left",1);
 txt(S.wave?(!isBossWave(S.wave)?t("hud.wave").replace("{n}",S.wave).replace("{total}",TOTAL_OLEADAS):t("hud.wave").replace("{n}",S.wave).replace("{total}",TOTAL_OLEADAS)+" · "+t("boss."+P.oleadas_tabla[S.wave].jefe+".name")):"",W/2,30,24,"#fff","center",1);
 txt(Math.floor(S.time/60)+":"+String(Math.floor(S.time%60)).padStart(2,"0"),W/2,58,16,"#bcd","center");
 // magazine
 for(let i=0;i<s.mag;i++){g.fillStyle=i<p.mag&&p.reload<=0?"#ffe9a0":"#ffffff22";g.fillRect(130+i*14,70,10,16);}txt(t("hud.bullet_damage","Daño {count}").replace("{count}",Math.round(s.dmgShown))+(s.barrels>1?" ×"+s.barrels:""),130,122,15,"#ffe9a0");if(p.reload>0)txt(t("hud.reloading","RECARGANDO {s} s").replace("{s}",p.reload.toFixed(1)),140+s.mag*14,78,14,"#ffe9a0");
 if(lvOf("velo_de_bruma")){txt(p.veilCd>0?"🌫 "+Math.ceil(p.veilCd)+" s":"🌫 "+u("veilready"),130,100,15,p.veilCd>0?"#8fb0e0":"#E6F0FF");}
 if(S.boss){bar(W/2-300,H-40,600,18,S.boss.hp/S.boss.max,"#ff6a1a");txt(t(S.boss.type=="kraken"?"boss.kraken.name":"boss.leviatan.name")+(S.boss.type=="kraken"?(S.boss.immune?(lang=="es"?" · rompe 2 tentáculos":" · break 2 tentacles"):S.boss.phase>=3?" · III":" · II"):"")+(S.boss.type=="kraken"?"":S.boss.furia?" · III":S.boss.phase?" · II":"")+(S.boss.enraged?" 🔥":""),W/2,H-58,18,"#ffb080","center",1);}
 // buttons
 const btn=(b,lab,cd,max,c)=>{g.fillStyle="rgba(0,0,0,.35)";g.beginPath();g.arc(b.x,b.y,b.r,0,7);g.fill();if(cd>0){g.fillStyle="rgba(255,255,255,.18)";g.beginPath();g.moveTo(b.x,b.y);g.arc(b.x,b.y,b.r,-Math.PI/2,-Math.PI/2+2*Math.PI*(1-cd/max));g.fill();}g.strokeStyle=cd>0?"#fff4":c;g.lineWidth=3;g.beginPath();g.arc(b.x,b.y,b.r,0,7);g.stroke();txt(lab,b.x,b.y,b.r*.7,cd>0?"#fff8":c,"center",1);};
 btn(BTN.ram,"⚡",p.ramCd,J.ramCooldown,"#ffd84a");if(RM){const b=BTN.rm,rd=(p.rm||0)>=100,pc=Math.floor(p.rm||0);g.fillStyle=rd?"rgba(255,140,20,"+(.35+.25*Math.sin(S.time*8))+")":"rgba(0,0,0,.35)";g.beginPath();g.arc(b.x,b.y,b.r,0,7);g.fill();g.strokeStyle="#ffffff22";g.lineWidth=6;g.beginPath();g.arc(b.x,b.y,b.r-3,0,7);g.stroke();g.strokeStyle=rd?"#ffd84a":"#ff8a30";g.beginPath();g.arc(b.x,b.y,b.r-3,-Math.PI/2,-Math.PI/2+2*Math.PI*pc/100);g.stroke();txt("🚀",b.x,b.y-8,26,"#fff","center");txt(pc+" %",b.x,b.y+20,15,rd?"#ffd84a":"#fff","center",1);}btn(BTN.shield,"🛡",p.shieldCd,J.shieldCooldown,"#7fd8ff");
 g.fillStyle="rgba(0,0,0,.35)";g.beginPath();g.arc(BTN.lang.x,BTN.lang.y,BTN.lang.r,0,7);g.fill();txt(lang.toUpperCase(),BTN.lang.x,BTN.lang.y,18,"#fff","center",1);const sbx=BTN.sens;g.fillStyle="rgba(0,0,0,.35)";g.fillRect(sbx.x-55,sbx.y-22,110,44);txt((lang=="es"?"Sens: ":"Sens: ")+SENS_LBL[lang][sens],sbx.x,sbx.y,16,"#fff","center",1);
 if(joy){g.strokeStyle="rgba(255,255,255,.25)";g.lineWidth=3;g.beginPath();g.arc(joy.cx,joy.cy,B.controles.palanca.radio_base_px*SENS[sens].alcance_px/90,0,7);g.stroke();g.fillStyle="rgba(255,255,255,.2)";g.beginPath();g.arc(joy.x,joy.y,B.controles.palanca.radio_pomo_px,0,7);g.fill();}
 if(S.banner){const a=Math.min(1,S.banner.t*2);g.globalAlpha=a;if(S.banner.boss){g.fillStyle="rgba(120,0,0,.45)";g.fillRect(0,H/2-60,W,120);}txt(S.banner.txt,W/2,H/2-(S.banner.boss?0:120),S.banner.boss?56:40,S.banner.boss?"#ffb080":"#fff","center",1);g.globalAlpha=1;}}
let cardRects=[];
function wrap(s,x,y,w,sz,c){g.font=sz+"px system-ui,Arial";const ws=s.split(" ");let line="",yy=y;for(const wd of ws){if(g.measureText(line+wd).width>w){txt(line,x,yy,sz,c,"center");line="";yy+=sz*1.3;}line+=wd+" ";}txt(line,x,yy,sz,c,"center");}
const RCOL={comun:"#9fb2c4",rara:"#39a0ff",epica:"#b066ff",legendaria:"#ffb020"};
function drawCards(){g.fillStyle="rgba(0,10,20,.72)";g.fillRect(0,0,W,H);txt(u("choose"),W/2,90,40,"#ffd84a","center",1);cardRects=[];const cw=330,ch=420,gap=40,x0=W/2-(cw*3+gap*2)/2;
 S.offer.forEach((c,i)=>{const x=x0+i*(cw+gap),y=150;cardRects.push({x,y,w:cw,h:ch});const col=RCOL[c.rareza];g.fillStyle="#0d2233";g.fillRect(x,y,cw,ch);g.strokeStyle=col;g.lineWidth=4;g.strokeRect(x,y,cw,ch);g.fillStyle=col;g.fillRect(x,y,cw,40);
  txt(u("rare")[c.rareza]||c.rareza,x+cw/2,y+20,18,"#06121c","center",1);const l=lvOf(c.id);txt(t(c.nombre_key,c.nombre),x+cw/2,y+80,26,"#fff","center",1);
  txt(l?("I II III IV V".split(" ")[l-1]+" → "+"I II III IV V".split(" ")[l]):u("newc")+" · I",x+cw/2,y+115,18,col,"center",1);
  if(c.id=="velo_de_bruma"){g.fillStyle="rgba(200,216,240,.25)";g.beginPath();g.arc(x+cw/2,y+175,38,0,7);g.fill();txt("🌫",x+cw/2,y+175,40,"#E6F0FF","center");}
  if(["polvora_fina","polvora_negra","bala_de_alma"].includes(c.id)){const before=Math.round(st().dmgShown);S.cards[c.id]=l+1;const after=Math.round(st().dmgShown);if(l)S.cards[c.id]=l;else delete S.cards[c.id];txt((lang=="es"?"Daño ":"Damage ")+before+" → "+after,x+cw/2,y+ch-30,22,"#ffd84a","center",1);}
  wrap(t(c.resumen_key,c.resumen),x+cw/2,y+(c.id=="velo_de_bruma"?235:160),cw-30,16,"#cfe");});
 const ry=H-60;cardRects.reroll={x:W/2-180,y:ry-25,w:360,h:50};g.fillStyle=S.rerolls>0?"#1d4060":"#222";g.fillRect(W/2-180,ry-25,360,50);txt(u("reroll")+(S.rerolls>0?"":" ✗"),W/2,ry,20,"#fff","center",1);}
let revRects={};
function drawRevive(){g.fillStyle="rgba(30,0,0,.7)";g.fillRect(0,0,W,H);txt(u("sunk"),W/2,140,56,"#ff6a50","center",1);
 if(S.mode=="watch"){g.fillStyle="#000";g.fillRect(W/2-320,220,640,300);txt(u("watching").replace("{s}",Math.ceil(S.watchT)),W/2,370,30,"#fff","center",1);return;}
 if(S.revived){revRects={give:{x:W/2-160,y:330,w:320,h:70}};btnR(revRects.give,u("giveup"),"#555");return;}
 txt(u("revq"),W/2,210,28,"#fff","center");revRects={};let y=260;
 if(S.firstVoyage){revRects.free={x:W/2-260,y,w:520,h:70};btnR(revRects.free,u("revfree"),"#2a8a4a");y+=90;}
 revRects.vid={x:W/2-260,y,w:520,h:70};btnR(revRects.vid,u("revvid"),"#1d6aa0");y+=90;revRects.dia={x:W/2-260,y,w:520,h:70};btnR(revRects.dia,u("revdia"),"#6a3ab0");y+=100;
 revRects.give={x:W/2-120,y,w:240,h:50};btnR(revRects.give,u("giveup"),"#444",20);}
function btnR(r,s,c,sz){g.fillStyle=c;g.fillRect(r.x,r.y,r.w,r.h);g.strokeStyle="#fff6";g.lineWidth=2;g.strokeRect(r.x,r.y,r.w,r.h);txt(s,r.x+r.w/2,r.y+r.h/2,sz||26,"#fff","center",1);}
function drawResults(){g.fillStyle="rgba(0,10,25,.85)";g.fillRect(0,0,W,H);const r=S.result;txt(r.win?t("end.victory","¡VICTORIA!"):t("end.defeat","DERROTA"),W/2,100,60,r.win?"#ffd84a":"#ff6a50","center",1);txt(u("res"),W/2,165,26,"#bcd","center");
 const rows=[[u("score"),r.score],[u("time"),Math.floor(S.time/60)+":"+String(Math.floor(S.time%60)).padStart(2,"0")],[u("kills"),S.kills],[u("souls"),Math.round(S.soulsTot)],[u("coins"),S.coins],[u("lvl"),S.lvl],[u("dmgt"),Math.round(S.dmgTaken)]];
 rows.forEach((q,i)=>{txt(q[0],W/2-40,215+i*44,26,"#cde","right");txt(String(q[1]),W/2+40,215+i*44,28,"#fff","left",1);});
 const cs=Object.entries(S.cards).map(([k,v])=>t("card."+k+".name",k)+" "+"I II III IV V".split(" ")[v-1]).join(" · ");wrap(cs,W/2,540,1100,18,"#9fc");
 revRects={again:{x:W/2-200,y:600,w:400,h:70}};btnR(revRects.again,u("again"),"#1d6aa0");}
const PX0=1272,FBTN=FORMS.map((f,i)=>({x:PX0-265+(i<3?i*180:90+(i-3)*180),y:i<3?548:612,w:170,h:56,f:i+1}));
function drawTitle(){const TI="titulo_"+(lang=="es"?"es":"en"),hasT=ok(TI);if(hasT){g.drawImage(IMG[TI],0,0,W,H);g.fillStyle="rgba(0,8,16,.78)";g.beginPath();g.roundRect(PX0-285,108,570,598,18);g.fill();g.strokeStyle="rgba(201,162,74,.8)";g.lineWidth=2;g.stroke();}else{g.fillStyle="rgba(0,10,20,.55)";g.fillRect(0,0,W,H);}{const c={...S.cam},pa=S.p.a;S.cam.x=S.p.x-(PX0-W/2)/PX;S.cam.y=S.p.y-(215-H/2)/PX;S.p.a=-Math.PI/2;g.save();g.translate(PX0,215);g.scale(1.6,1.6);g.translate(-PX0,-215);S.p.a=0;drawPlayer();g.restore();S.cam=c;S.p.a=pa;txt(t("ship.form."+FORMS[form-1]),PX0,320,26,"#fff","center",1);}if(!hasT){txt("GRIMKEEL",W/2,220,110,"#d8e8f8","center",1);txt("OCEAN SURGE",W/2,310,46,"#39e0ff","center",1);}txt(u("sub")+" · "+DIFF.version,hasT?PX0:W/2,hasT?130:380,15,"#bcd","center");
 txt(t("ship.form.label","Forma {n}").replace("{n}","")+(lang=="es"?"del barco:":"of the ship:"),PX0,530,17,"#9cf","center");for(const b of FBTN){const on=b.f==form;g.fillStyle=on?"#1d6aa0":"rgba(0,0,0,.45)";g.fillRect(b.x,b.y,b.w,b.h);g.strokeStyle=on?"#7fd8ff":"#fff3";g.lineWidth=on?3:1;g.strokeRect(b.x,b.y,b.w,b.h);txt(t("ship.form.label","Forma {n}").replace("{n}",b.f)+" · "+[0,10,20,30,40][b.f-1],b.x+b.w/2,b.y+16,13,"#cde","center");txt(t("ship.form."+FORMS[b.f-1],FORMS[b.f-1])+(b.f>=4?" 🪽":""),b.x+b.w/2,b.y+39,17,on?"#fff":"#bcd","center",1);}
 if(form>=4)txt("🔷 "+t("wings.name","Alas azules")+": "+t("wings.desc",""),PX0,690,12,"#8fd0ff","center");
 txt(u("tap"),PX0,380,36,Math.floor(Date.now()/500)%2?"#ffd84a":"#fff","center",1);txt(u("ctrl"),PX0,430,13,"#cde","center");txt(u("kb"),PX0,460,11,"#9ab","center");
 g.fillStyle="rgba(0,0,0,.35)";g.beginPath();g.arc(BTN.lang.x,BTN.lang.y,BTN.lang.r,0,7);g.fill();txt(lang.toUpperCase(),BTN.lang.x,BTN.lang.y,18,"#fff","center",1);const sbx=BTN.sens;g.fillStyle="rgba(0,0,0,.35)";g.fillRect(sbx.x-55,sbx.y-22,110,44);txt((lang=="es"?"Sens: ":"Sens: ")+SENS_LBL[lang][sens],sbx.x,sbx.y,16,"#fff","center",1);}
const inR=(q,r)=>r&&q.x>=r.x&&q.x<=r.x+r.w&&q.y>=r.y&&q.y<=r.y+r.h;
function handleTaps(){while(taps.length){const q=taps.shift();
 if(S.mode=="title"){if(D(q,BTN.lang)<BTN.lang.r){toggleLang();continue;}const fb=FBTN.find(b=>inR(q,b));if(fb){form=fb.f;localStorage.setItem("gk_form",form);continue;}if(Math.abs(q.x-BTN.sens.x)<60&&Math.abs(q.y-BTN.sens.y)<30){cycleSens();continue;}S.mode="play";startWave(1);}
 else if(S.mode=="cards"){cardRects.forEach((r,i)=>{if(inR(q,r))pickCard(i);});if(inR(q,cardRects.reroll)&&S.rerolls>0){S.rerolls--;S.offer=makeOffer();}}
 else if(S.mode=="dead"){if(inR(q,revRects.free))revive();else if(inR(q,revRects.vid)){S.mode="watch";S.watchT=3;}else if(inR(q,revRects.dia))revive();else if(inR(q,revRects.give))endRun(false);}
 else if(S.mode=="results"){if(inR(q,revRects.again)){newRun();timers=[];S.mode="play";startWave(1);}}}}
let last=performance.now();
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;wavesT+=dt;handleTaps();update(dt);render();requestAnimationFrame(loop);}
// ---------- test hooks (?test=...)
window.GK={get S(){return S},fireMissiles,doRam,spawnKraken,setForm(f){form=f},spawn,stats:()=>st(),step(sec,ap){auto=ap||auto;const n=Math.round(sec*60);for(let i=0;i<n;i++){wavesT+=1/60;handleTaps();update(1/60);}},newRun,startWave,pickCard,playerHit,levelUp,setAuto(f){auto=f},render};
newRun();resize();
const TEST=new URLSearchParams(location.search).get("test");
if(TEST){window.__test=1;Math.random=(()=>{let s=12345;return()=>((s=Math.imul(s^s>>>15,1|s)+0x6D2B79F5|0),((s^s>>>7)>>>0)/4294967296);})();window.__runTest&&0;}
requestAnimationFrame(loop);
