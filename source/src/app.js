"use strict";
/* ================= Palette & themes (40C3 style guide) ================= */
const P = {c0:"#75b44b",c1:"#15ada3",c2:"#9fa4e8",c3:"#c892d6",c4:"#ee5da2",c5:"#ea6f82",c6:"#f88a30",c7:"#ffbc40",A:"#ebedf0",B:"#001300"};
const THEMES = [
  {name:"Classic",   bg:P.B,      ink:P.A, acc:P.c0},
  {name:"Zero Days", bg:P.c4,     ink:P.A, acc:P.A},
  {name:"Rabbit",    bg:P.c0,     ink:P.B, acc:P.B},
  {name:"Bright",    bg:"#e3f4fb",ink:P.B, acc:P.c0},
  {name:"Mate",      bg:"#523e3d",ink:P.c6,acc:P.c7},
  {name:"Dangerous", bg:P.c7,     ink:P.B, acc:P.B},
  {name:"Cuteness",  bg:P.c2,     ink:P.A, acc:P.A},
  {name:"Terminal",  bg:P.B,      ink:P.c0,acc:P.c4},
  {name:"Teal",      bg:P.c1,     ink:P.B, acc:P.A},
  {name:"Lilac",     bg:P.B,      ink:P.c3,acc:P.c7},
  {name:"Coral",     bg:P.c5,     ink:P.B, acc:P.A},
  {name:"Paper",     bg:P.A,      ink:P.B, acc:P.c4},
];

/* ================= SVG recoloring ================= */
const ROLE = {"#ebedf0":"ink","#e7edea":"ink","#fffbff":"ink","#75b44b":"acc","#6ab143":"acc","#75b24c":"acc",
              "#001300":"bg","#000d00":"bg","#020308":"bg","#12110f":"bg"};
function recolor(svg, col, mono){
  const found = new Set((svg.match(/#[0-9a-fA-F]{6}\b/g)||[]).map(s=>s.toLowerCase()));
  const known = [...found].filter(h=>ROLE[h]);
  if (mono || (known.length===found.size && new Set(known.map(h=>ROLE[h])).size===1))
    return svg.replace(/#[0-9a-fA-F]{6}\b/g, mono || col.acc);
  return svg.replace(/#[0-9a-fA-F]{6}\b/g, h => { const r = ROLE[h.toLowerCase()]; return r ? col[r] : h; });
}
function svgSize(svg){ const v = svg.match(/viewBox="([\d.\-\s]+)"/)[1].trim().split(/\s+/).map(Number); return {w:v[2], h:v[3]}; }
const imgCache = new Map();
function svgImage(name, col, mono){
  const key = name+"|"+col.bg+col.ink+col.acc+"|"+(mono||"");
  if (imgCache.has(key)) return imgCache.get(key);
  let svg = recolor(ASSETS[name], col, mono);
  const {w,h} = svgSize(svg);
  svg = svg.replace(/<svg\b/, `<svg width="${w}" height="${h}"`);
  const p = new Promise(res=>{ const im = new Image(); im.onload=()=>res(im); im.onerror=()=>res(null);
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
  if (imgCache.size>600) imgCache.clear();
  imgCache.set(key,p); return p;
}
function ratioOf(name){ const {w,h}=svgSize(ASSETS[name]); return w/h; }
const svgURL = (name,col,mono) => "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(recolor(ASSETS[name],col,mono));
/* ================= State ================= */
const $ = id => document.getElementById(id);
const state = {tpl:"talk", theme:0, col:{...THEMES[0]}, decos:[], fx:{}, userImgs:[], hidden:{}, offsets:{}};
const CATS = {"Icons_Deco":"Icons","Boxes":"Boxes","Citizens":"Citizens","user":"Your images"};
const allDecos = Object.keys(ASSETS).filter(k=>/^(Icons_Deco|Boxes|Citizens)\//.test(k));
const patterns = Object.keys(ASSETS).filter(k=>k.startsWith("Patterns/"));
const nice = k => k.split("/").pop().replace(/\.svg$/,"").replace(/^(Icon_|Box_|Pattern_?)/,"");
const DEFAULT_DECOS = ["Icons_Deco/Square1.svg","Icons_Deco/Icon_Smiley.svg","Icons_Deco/Star.svg","Citizens/Adam.svg","Icons_Deco/Chaosknoten.svg","Icons_Deco/Icon_Cat.svg"];
const FIELDS = ["format","cw","ch","kicker","title","subtitle","body","tag","tag2","footer","tfont","align","caps","underline","tsize","tspace","bsize",
  "logo","logoCol","lsize","pattern","texture","popac","pscale","frame","dcount","dsize","dtint","dur","fps","gscale",
  "lgLeft","lgRight","lgFont","lgStyle","lgGap","lgEye","lgRays","lgCap","lgLayout","lgCapSize","lgColSrc","lgCol","lgCapCol","lgTransp","lgSize"];
const DEFAULTS = {};
/* elements that can be hidden / moved, per template */
const EL_NAMES = {logo:"Logo",kicker:"Kicker",title:"Title",subtitle:"Subtitle",labels:"Labels",body:"Body text",footer:"Footer",
  decos:"Decorations",pattern:"Pattern band",rulers:"Rulers",quote:"Quote mark",band:"Top band",avatar:"Avatar",bracket:"Bracket"};
const TPL_ELS = {
  talk:["logo","kicker","title","subtitle","labels","body","bracket","decos","footer"],
  banner:["logo","kicker","title","subtitle","decos","rulers"],
  poster:["logo","footer","decos","kicker","title","subtitle","labels","body","pattern"],
  quote:["logo","quote","title","subtitle","labels","avatar","footer"],
  badge:["band","logo","avatar","title","subtitle","labels","body","footer"],
  logo:["logo"],
};
const TEXT_TPL = ["talk","banner","poster","quote","badge"];
const shown = k => !state.hidden[k];

/* ================= UI ================= */
function buildUI(){
  FIELDS.forEach(id=>{ const e=$(id); DEFAULTS[id]= e.type==="checkbox"? e.checked : e.value; });
  const th = $("themes");
  THEMES.forEach((t,i)=>{
    const b=document.createElement("button"); b.type="button"; b.className="sw"; b.title=t.name+(i<8?" (style guide)":"");
    b.style.background=t.bg; b.style.color=t.ink; b.style.boxShadow=`inset -12px 0 0 ${t.acc}`; b.textContent=t.name;
    b.onclick=()=>setTheme(i); th.appendChild(b);
  });
  $("pattern").innerHTML='<option value="">None</option>'+patterns.map(p=>`<option value="${p}">${nice(p)}</option>`).join("");
  $("decoCat").innerHTML=Object.entries(CATS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
  $("decoCat").onchange=drawDecoGrid;
  document.querySelectorAll("#tpl button").forEach(b=>b.onclick=()=>{ setTpl(b.dataset.v); render(); save(); });
  FIELDS.forEach(id=>$(id).addEventListener("input",()=>{
    if(id==="format") $("customSize").hidden=$("format").value!=="custom";
    if(id==="dur") $("durV").textContent=$("dur").value;
    if(id==="lgColSrc") $("lgCustom").hidden=$("lgColSrc").value!=="custom";
    render(); save();
  }));
  ["cBg","cInk","cAcc"].forEach((id,i)=>$(id).addEventListener("input",e=>{
    state.col[["bg","ink","acc"][i]]=e.target.value; markTheme(-1); render(); save();
  }));
  $("swapCol").onclick=()=>{ const c=state.col; [c.bg,c.ink]=[c.ink,c.bg]; syncColorInputs(); markTheme(-1); render(); save(); };
  $("randCol").onclick=()=>{ randomMix(); render(); save(); };
  $("shuffle").onclick=()=>{ shuffleDecos(); drawDecoGrid(); render(); save(); };
  $("clearDeco").onclick=()=>{ state.decos=[]; drawDecoGrid(); render(); save(); };
  $("random").onclick=surprise;
  $("dl").onclick=()=>download("png"); $("dljpg").onclick=()=>download("jpg"); $("copy").onclick=copyImg;
  $("gif").onclick=exportGif; $("video").onclick=exportVideo; $("play").onclick=togglePlay;
  document.querySelectorAll("#fxList input").forEach(c=>c.addEventListener("change",()=>{
    state.fx[c.dataset.fx]=c.checked; save(); if(!anyFx() && playing) togglePlay(); else if(anyFx() && !playing) togglePlay();
  }));
  $("upload").onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>15*1048576){ $("info").textContent="This image is too big (max. 15 MB)."; e.target.value=""; return; }
    const r=new FileReader();
    r.onload=()=>{ const im=new Image();
      im.onload=()=>{ const key="user:"+Date.now(); state.userImgs.push({key,img:im,src:r.result});
        state.decos.unshift(key); $("decoCat").value="user"; drawDecoGrid(); render(); };
      im.onerror=()=>{ $("info").textContent="This file could not be read as an image."; };
      im.src=r.result; };
    r.readAsDataURL(f); e.target.value="";
  };
  $("reset").onclick=()=>{ if(!confirm("Reset all settings to default?")) return; try{localStorage.removeItem(LS)}catch(e){} location.reload(); };
  $("saveJson").onclick=()=>{ const b=new Blob([JSON.stringify(snapshot(),null,2)],{type:"application/json"}); saveBlob(b,"40c3-preset.json"); };
  $("loadJsonBtn").onclick=()=>$("loadJson").click();
  $("loadJson").onchange=e=>{ const f=e.target.files[0]; if(!f) return; f.text().then(t=>{ try{ restore(JSON.parse(t)); render(); save(); }catch(err){ $("info").textContent="This file is not a valid preset."; } }); e.target.value=""; };
  $("resetPos").onclick=()=>{ state.offsets[state.tpl]={}; sel=null; render(); save(); };
  $("showAll").onclick=()=>{ state.hidden={}; drawElList(); render(); save(); };
  initDrag();
}
function setTpl(v){
  if(!TPL_ELS[v]) v="talk";
  state.tpl=v; sel=null; document.querySelectorAll("#tpl button").forEach(x=>x.classList.toggle("on",x.dataset.v===v));
  const isLogo=v==="logo";
  ["secText","secType","secDeco","secBg","secLogo"].forEach(id=>$(id).hidden=isLogo);
  if(isLogo!==state.wasLogo) $("secLogoMaker").open=isLogo; state.wasLogo=isLogo;
  $("lgHint").hidden=isLogo;
  drawElList();
}
function drawElList(){
  const box=$("elList"); box.innerHTML="";
  TPL_ELS[state.tpl].forEach(k=>{
    const l=document.createElement("label"); l.className="check";
    const c=document.createElement("input"); c.type="checkbox"; c.checked=shown(k);
    c.onchange=()=>{ if(c.checked) delete state.hidden[k]; else state.hidden[k]=true; render(); save(); };
    l.append(c," "+EL_NAMES[k]); box.appendChild(l);
  });
}
function syncColorInputs(){ $("cBg").value=state.col.bg; $("cInk").value=state.col.ink; $("cAcc").value=state.col.acc; }
function markTheme(i){ state.theme=i; document.querySelectorAll(".sw").forEach((s,j)=>s.classList.toggle("on",j===i)); }
function setTheme(i, silent){ state.col={...THEMES[i]}; markTheme(i); syncColorInputs(); if(!silent){ render(); save(); } }
function randomMix(){
  const cs=Object.values(P); const bg=pick(cs); const others=cs.filter(c=>c!==bg && contrast(c,bg)>2.2);
  const ink=pick(others.length?others:[P.A,P.B]); const acc=pick(others.filter(c=>c!==ink).concat(ink));
  state.col={bg,ink,acc}; markTheme(-1); syncColorInputs();
}
function lum(h){ const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4); return .2126*v[0]+.7152*v[1]+.0722*v[2]; }
function contrast(a,b){ const x=lum(a),y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
const pick = a => a[Math.floor(Math.random()*a.length)];
function shuffleDecos(pool){
  pool=(pool||allDecos.filter(k=>!/Lines|Fairydust|Arrow/.test(k))).slice();
  state.decos=state.userImgs.map(u=>u.key);
  while(state.decos.length<6 && pool.length){ const j=Math.floor(Math.random()*pool.length); state.decos.push(pool.splice(j,1)[0]); }
}
/* "Surprise me" stays inside the style guide: official palettes, Jersey 10 headings,
   Hack body, official logo, simple decorations; texts and template are kept. */
function surprise(){
  setTheme(Math.floor(Math.random()*8), true);
  ["tsize","tspace","bsize","lsize","dsize","dcount","popac","pscale","dtint","underline","caps","align"].forEach(id=>{ const e=$(id); if(e.type==="checkbox") e.checked=DEFAULTS[id]; else e.value=DEFAULTS[id]; });
  $("tfont").value="jersey";
  $("texture").value=""; $("frame").value= Math.random()<.25 ? "corners" : "";
  $("pattern").value = state.tpl==="poster" || Math.random()<.35 ? pick(patterns.filter(p=>!/Lime|Mouse/.test(p))) : "";
  if($("logo").value==="none"||$("logo").value==="custom") $("logo").value="icon";
  $("logoCol").value = Math.random()<.7 ? "ink" : "acc";
  shuffleDecos(allDecos.filter(k=>/^Icons_Deco\/(Icon_|Star|Square|Chaosknoten)|^Citizens\/(Adam|Barbara|bip)/.test(k)));
  drawDecoGrid(); render(); save();
}
function drawDecoGrid(){
  const cat=$("decoCat").value, g=$("decos"); g.innerHTML="";
  const ui={bg:"#062006",ink:P.A,acc:P.c0};
  const items = cat==="user" ? state.userImgs.map(u=>({k:u.key,src:u.src,t:"Your image"})) : allDecos.filter(k=>k.startsWith(cat+"/")).map(k=>({k,src:svgURL(k,ui),t:nice(k)}));
  if(!items.length) g.innerHTML='<div class="hint" style="grid-column:1/-1">No image yet: use “Your image” below to add one.</div>';
  items.forEach(({k,src,t})=>{
    const b=document.createElement("button"); b.type="button"; b.title=t; b.setAttribute("aria-pressed",state.decos.includes(k)); b.classList.toggle("on",state.decos.includes(k));
    const im=document.createElement("img"); im.alt=t; im.src=src; b.appendChild(im);
    b.onclick=()=>{ const i=state.decos.indexOf(k); if(i>=0) state.decos.splice(i,1); else state.decos.push(k);
      b.classList.toggle("on",i<0); b.setAttribute("aria-pressed",i<0); updCount(); render(); save(); };
    g.appendChild(b);
  });
  updCount();
}
function updCount(){ $("decoCount").textContent = state.decos.length+" selected"; }

/* ================= Persistence ================= */
const LS="40c3-generator-v3";
function snapshot(){
  const f={}; FIELDS.forEach(id=>{ const e=$(id); f[id]= e.type==="checkbox"? e.checked : e.value; });
  return {version:3, fields:f, tpl:state.tpl, theme:state.theme, col:state.col, decos:state.decos.filter(k=>!k.startsWith("user:")), fx:state.fx, hidden:state.hidden, offsets:state.offsets};
}
const isHex = v => typeof v==="string" && /^#[0-9a-f]{6}$/i.test(v);
function restore(s){
  if(!s||typeof s!=="object"||!s.fields) throw new Error("invalid preset");
  FIELDS.forEach(id=>{ if(!(id in s.fields)) return; const e=$(id), v=s.fields[id];
    if(e.type==="checkbox") e.checked=!!v;
    else if(e.tagName==="SELECT"){ if([...e.options].some(o=>o.value===String(v))) e.value=String(v); }
    else e.value=String(v).slice(0,2000); });
  if(s.col && isHex(s.col.bg) && isHex(s.col.ink) && isHex(s.col.acc)){ state.col={bg:s.col.bg,ink:s.col.ink,acc:s.col.acc}; syncColorInputs(); markTheme(Number.isInteger(s.theme)?s.theme:-1); }
  if(Array.isArray(s.decos)) state.decos=s.decos.filter(k=>typeof k==="string" && ASSETS[k]);
  state.fx = s.fx && typeof s.fx==="object" ? s.fx : {}; document.querySelectorAll("#fxList input").forEach(c=>c.checked=!!state.fx[c.dataset.fx]);
  state.hidden = s.hidden && typeof s.hidden==="object" ? s.hidden : {};
  state.offsets = s.offsets && typeof s.offsets==="object" ? s.offsets : {};
  setTpl(s.tpl||"talk");
  $("customSize").hidden=$("format").value!=="custom"; $("durV").textContent=$("dur").value; $("lgCustom").hidden=$("lgColSrc").value!=="custom";
  drawDecoGrid();
}
let saveT=0;
function save(){ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ localStorage.setItem(LS,JSON.stringify(snapshot())); }catch(e){} },300); }

/* ================= Elements: hit boxes, offsets, dragging ================= */
let CUR=null, CUROFF={x:0,y:0}, BOXES={}, CW=1, CH=1, SUP=0;
function off(key){ const o=(state.offsets[state.tpl]||{})[key]; return o||{x:0,y:0}; }
function beginEl(ctx,key){ const o=off(key); ctx.save(); ctx.translate(o.x*CW,o.y*CH); CUR=key; CUROFF={x:o.x*CW,y:o.y*CH}; }
function endEl(ctx){ ctx.restore(); CUR=null; CUROFF={x:0,y:0}; }
function addBox(x,y,w,h){
  if(!CUR||SUP||!(w>0&&h>0)) return; const nx=x+CUROFF.x, ny=y+CUROFF.y, b=BOXES[CUR];
  if(!b) BOXES[CUR]={x:nx,y:ny,x2:nx+w,y2:ny+h}; else { b.x=Math.min(b.x,nx); b.y=Math.min(b.y,ny); b.x2=Math.max(b.x2,nx+w); b.y2=Math.max(b.y2,ny+h); }
}
let sel=null, hover=null, drag=null, lastFrame=null, lastBoxes={}, dragRAF=0;
function hit(p){
  let best=null, area=Infinity;
  for(const [k,b] of Object.entries(lastBoxes)){ const pad=6*CW/($("cv").clientWidth||CW);
    if(p.x>=b.x-pad&&p.x<=b.x2+pad&&p.y>=b.y-pad&&p.y<=b.y2+pad){ const a=(b.x2-b.x)*(b.y2-b.y); if(a<area){area=a;best=k;} } }
  return best;
}
function overlay(){
  const cv=$("cv"); if(!lastFrame) return; const x=cv.getContext("2d");
  x.drawImage(lastFrame,0,0);
  const s=Math.max(cv.width,cv.height)/Math.max(1,Math.max(cv.clientWidth,cv.clientHeight));
  for(const k of [hover,sel]){ if(!k||!lastBoxes[k]) continue; const b=lastBoxes[k];
    x.save(); x.lineWidth=2*s; x.setLineDash([6*s,4*s]); x.strokeStyle=k===sel?"#ffbc40":"#15ada3";
    x.strokeRect(b.x-4*s,b.y-4*s,b.x2-b.x+8*s,b.y2-b.y+8*s);
    x.setLineDash([]); x.font=`700 ${12*s}px Hack, monospace`; const label=EL_NAMES[k]||k, tw=x.measureText(label).width;
    const ly=Math.max(0,b.y-4*s-18*s); x.fillStyle=x.strokeStyle; x.fillRect(b.x-4*s,ly,tw+10*s,18*s); x.fillStyle="#001300"; x.fillText(label,b.x+1*s,ly+13*s); x.restore(); }
}
function initDrag(){
  const cv=$("cv");
  const pt=e=>{ const r=cv.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*cv.width, y:(e.clientY-r.top)/r.height*cv.height}; };
  cv.addEventListener("pointermove",e=>{
    const p=pt(e);
    if(drag){
      const o=state.offsets[state.tpl]||(state.offsets[state.tpl]={});
      o[drag.key]={x:drag.ox+(p.x-drag.px)/cv.width, y:drag.oy+(p.y-drag.py)/cv.height};
      if(!dragRAF) dragRAF=requestAnimationFrame(()=>{ dragRAF=0; render(); });
    } else { const h=hit(p); if(h!==hover){ hover=h; cv.style.cursor=h?"move":"default"; overlay(); } }
  });
  cv.addEventListener("pointerdown",e=>{
    const p=pt(e), k=hit(p); sel=k; overlay(); if(!k) return;
    const o=off(k); drag={key:k,px:p.x,py:p.y,ox:o.x,oy:o.y}; cv.setPointerCapture(e.pointerId); e.preventDefault();
  });
  const end=()=>{ if(drag){ drag=null; save(); } };
  cv.addEventListener("pointerup",end); cv.addEventListener("pointercancel",end);
  cv.addEventListener("pointerleave",()=>{ if(!drag && hover){ hover=null; overlay(); } });
  cv.addEventListener("dblclick",e=>{ const k=hit(pt(e)); if(k&&state.offsets[state.tpl]){ delete state.offsets[state.tpl][k]; render(); save(); } });
  cv.addEventListener("keydown",e=>{
    if(!sel) return; const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(e.key==="Escape"){ sel=null; overlay(); return; }
    if(!d) return; e.preventDefault(); const st=e.shiftKey?0.02:0.004; const o=state.offsets[state.tpl]||(state.offsets[state.tpl]={});
    const c=o[sel]||{x:0,y:0}; o[sel]={x:c.x+d[0]*st,y:c.y+d[1]*st}; render(); save();
  });
}

/* ================= Drawing helpers ================= */
const FJ = '"Jersey 10"', FH = '"Hack"';
function font(ctx,size,fam,bold,ls){ ctx.font=`${bold?"700 ":""}${size}px ${fam}`; try{ ctx.letterSpacing = ls? (size*ls).toFixed(2)+"px" : "0px"; }catch(e){} }
function wrap(ctx,text,maxW){
  const out=[];
  for (const para of String(text).split("\n")){
    const words=para.split(/ +/); let line="";
    for (let w of words){
      while (ctx.measureText(w).width>maxW && w.length>1){
        let k=w.length; while(k>1 && ctx.measureText((line?line+" ":"")+w.slice(0,k)).width>maxW) k--;
        if (k<=1 && line){ out.push(line); line=""; continue; }
        out.push((line?line+" ":"")+w.slice(0,k)); line=""; w=w.slice(k);
      }
      const t=line?line+" "+w:w;
      if (ctx.measureText(t).width<=maxW || !line) line=t; else { out.push(line); line=w; }
    }
    out.push(line);
  }
  return out;
}
/* largest font size whose wrapped text fits the box */
function fit(ctx,text,fam,bold,maxW,maxH,lh,maxSize,minSize=8,ls=0){
  maxH=Math.max(maxH,minSize*lh); let lo=minSize, hi=Math.max(maxSize,minSize), best=null;
  for (let i=0;i<18;i++){
    const s=(lo+hi)/2; font(ctx,s,fam,bold,ls); const lines=wrap(ctx,text,maxW);
    if (lines.length*s*lh<=maxH){ best={size:s,lines}; lo=s; } else hi=s;
  }
  if(!best){ font(ctx,minSize,fam,bold,ls); best={size:minSize,lines:wrap(ctx,text,maxW)}; }
  font(ctx,best.size,fam,bold,ls); best.width=Math.max(0,...best.lines.map(l=>ctx.measureText(l).width));
  Object.assign(best,{height:best.lines.length*best.size*lh, fam, bold, ls, lh}); return best;
}
/* draws wrapped lines; o.reveal = number of characters shown (typewriter), o.cursor = draw block cursor */
function drawLines(ctx,f,x,y,color,align="left",o={}){
  font(ctx,f.size,f.fam,f.bold,f.ls); ctx.fillStyle=color; ctx.textBaseline="alphabetic"; ctx.textAlign=align;
  let left = o.reveal==null ? Infinity : o.reveal, cur=null;
  f.lines.forEach((l,i)=>{
    if(left<=0 && cur) return;
    const shown = left>=l.length ? l : l.slice(0,Math.max(0,left)); left-=l.length+1;
    const by=y+f.size*(i*f.lh)+f.size*0.8;
    ctx.fillText(shown,x,by);
    const w=ctx.measureText(shown).width, x0= align==="center"?x-w/2: align==="right"?x-w:x;
    const fw=ctx.measureText(l).width, fx0= align==="center"?x-fw/2: align==="right"?x-fw:x;
    addBox(fx0,by-f.size*0.8,fw,f.size*Math.max(1,f.lh)*(o.underline?1.05:1));
    if(o.underline && shown) ctx.fillRect(x0,by+f.size*0.14,w,Math.max(1.5,f.size*0.07));
    cur={x:x0+w+f.size*0.08,y:by,size:f.size};
  });
  if(o.cursor && cur){ ctx.fillRect(cur.x,cur.y-cur.size*0.72,cur.size*0.42,cur.size*0.78); }
  ctx.textAlign="left";
}
function drawImgFit(ctx,im,x,y,w,h,align="center"){
  const r=im.width/im.height; let dw=w, dh=w/r; if(dh>h){dh=h;dw=h*r;}
  const dx= align==="left"?x: align==="right"? x+w-dw : x+(w-dw)/2;
  ctx.drawImage(im,dx,y+(h-dh)/2,dw,dh); addBox(dx,y+(h-dh)/2,dw,dh); return {x:dx,y:y+(h-dh)/2,w:dw,h:dh};
}
async function drawAsset(ctx,name,x,y,w,h,col,mono,align="center"){
  if(name.startsWith("user:")){ const u=state.userImgs.find(u=>u.key===name); return u? drawImgFit(ctx,u.img,x,y,w,h,align):null; }
  const im=await svgImage(name,col,mono); if(!im) return null; return drawImgFit(ctx,im,x,y,w,h,align);
}
function decoMono(name,col){ if(/Citizens\//.test(name)) return null; const t=$("dtint").value; return t==="acc"?col.acc: t==="ink"?col.ink: undefined; }
async function drawDeco(ctx,name,x,y,w,h,col,i=0){
  const dy = FX.float ? Math.sin((FX.t+i*0.17)*Math.PI*2)*h*0.08 : 0;
  return drawAsset(ctx,name,x,y+dy,w,h,col,decoMono(name,col));
}
function strokeRect(ctx,x,y,w,h,lw,color){ ctx.strokeStyle=color; ctx.lineWidth=lw; ctx.strokeRect(x+lw/2,y+lw/2,w-lw,h-lw); }
function tagBox(ctx,text,x,y,size,filled,col,maxW){
  if(!text) return {w:0,h:0};
  font(ctx,size,FJ); let t=text; while(ctx.measureText(t).width+size*0.9>maxW && t.length>1) t=t.slice(0,-1);
  const w=ctx.measureText(t).width+size*0.9, h=size*1.35;
  const off = FX.blink && Math.floor(FX.t*6)%2===(filled?0:1);
  if(filled){ ctx.fillStyle=off?col.acc:col.ink; ctx.fillRect(x,y,w,h); ctx.fillStyle=col.bg; }
  else { const c=off?col.acc:col.ink; strokeRect(ctx,x,y,w,h,Math.max(2,size*0.07),c); ctx.fillStyle=c; }
  ctx.textBaseline="middle"; ctx.fillText(t,x+size*0.45,y+h*0.54); ctx.textBaseline="alphabetic";
  addBox(x,y,w,h); return {w,h};
}
function tagsRow(ctx,t,x,y,size,col,maxW,stack){
  let cx=x, cy=y, H=0;
  if(t.tag){ const r=tagBox(ctx,t.tag,cx,cy,size,true,col,maxW); if(stack){cy+=r.h+size*0.5;} else {cx+=r.w+size*0.5;} H=r.h; }
  if(t.tag2){ const r=tagBox(ctx,t.tag2,cx,cy,size,false,col,stack?maxW:x+maxW-cx); H= stack? cy-y+r.h : Math.max(H,r.h); }
  return H;
}
function bracket(ctx,x,y,h,s,color){
  const lw=Math.max(2,s*0.004), d=s*0.025; ctx.strokeStyle=color; ctx.lineWidth=lw;
  ctx.beginPath(); ctx.moveTo(x-d,y); ctx.lineTo(x,y); ctx.lineTo(x,y+h); ctx.lineTo(x-d,y+h);
  ctx.moveTo(x,y+h*0.42); ctx.lineTo(x-d*0.55,y+h*0.42); ctx.moveTo(x,y+h*0.7); ctx.lineTo(x-d*0.55,y+h*0.7); ctx.stroke(); addBox(x-d,y,d+lw,h);
}
async function patternBand(ctx,name,x,y,w,h,col){
  const pw=h*ratioOf(name); let px=x-(pw-(w%pw))/2 - (FX.scroll? FX.t*pw : 0);
  ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip(); SUP++;
  for(;px<x+w;px+=pw) if(px+pw>x) await drawAsset(ctx,name,px,y,pw,h,col,col.acc);
  SUP--; ctx.restore(); addBox(x,y,w,h);
}
async function decoBox(ctx,name,x,y,size,col,outline,i=0){
  const lw=Math.max(2,size*0.03); addBox(x,y,size,size);
  if(outline) strokeRect(ctx,x,y,size,size,lw,outline);
  if(name){ const pad = /Boxes\//.test(name) ? (outline?size*0.08:0) : name.startsWith("user:") ? lw*2 : size*0.16;
    ctx.save(); ctx.beginPath(); ctx.rect(x+lw,y+lw,size-2*lw,size-2*lw); ctx.clip();
    await drawDeco(ctx,name,x+pad,y+pad,size-2*pad,size-2*pad,col,i); ctx.restore(); }
  else { ctx.strokeStyle=outline||col.acc; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(x,y);ctx.lineTo(x+size,y+size);ctx.moveTo(x+size,y);ctx.lineTo(x,y+size);ctx.stroke(); }
}
/* logo: returns its drawn width for a given height */
function logoRatio(kind){
  if(kind==="text") return 138.02/71.06; if(kind==="icon") return 67.65/88.42;
  if(kind==="custom"){ const c=buildLogo(logoOpts(),100); return c.width/c.height; } return 0;
}
async function drawLogo(ctx,x,y,h,col,align="left"){
  const kind=logoKind(); if(kind==="none") return null;
  h*= +$("lsize").value/100;
  const c = $("logoCol").value==="acc" ? col.acc : col.ink;
  const pulse = FX.pulse ? 1+Math.sin(FX.t*Math.PI*2)*0.06 : 1;
  const w=h*logoRatio(kind), dx= align==="right"? x-w : align==="center"? x-w/2 : x;
  ctx.save(); ctx.translate(dx+w/2,y+h/2); ctx.scale(pulse,pulse); ctx.translate(-w/2,-h/2);
  SUP++;
  if(kind==="custom"){ const o={...logoOpts(), color:c, capColor:c, bg:null}; ctx.drawImage(buildLogo(o,Math.ceil(h*1.5)),0,0,w,h); }
  else await drawAsset(ctx, kind==="text"?"Logos/40C3_LogoText_A.svg":"Logos/40C3_Logo_A.svg",0,0,w,h,col,c);
  SUP--; ctx.restore(); addBox(dx,y,w,h); return {w,h,x:dx};
}
function logoKind(){ return shown("logo") ? $("logo").value : "none"; }
function logoSize(h){ const k=logoKind(); if(k==="none") return {w:0,h:0}; const hh=h*(+$("lsize").value/100); return {w:hh*logoRatio(k),h:hh}; }
/* ================= Text values ================= */
function T(){
  const caps=$("caps").checked; const tf=$("tfont").value;
  const v = (id,key) => shown(key) ? $(id).value.trim() : "";
  const title = shown("title") ? $("title").value : "";
  return {title:caps?title.toUpperCase():title, kicker:v("kicker","kicker"), subtitle:v("subtitle","subtitle"), body:v("body","body"),
    tag:v("tag","labels"), tag2:v("tag2","labels"), footer:v("footer","footer"),
    tscale:+$("tsize").value/100, bscale:+$("bsize").value/100, pattern:$("pattern").value, center:$("align").value==="center",
    tfam: tf==="jersey"?FJ:FH, tbold: tf==="hackb", tlh: tf==="jersey"?0.92:1.12, tls: +$("tspace").value/100,
    underline:$("underline").checked, ndeco: shown("decos") ? +$("dcount").value : 0, dscale:+$("dsize").value/100,
    avatar: shown("avatar") && +$("dcount").value>0 ? state.decos[0] : null};
}
function fitTitle(ctx,t,maxW,maxH,maxSize,minSize){ return fit(ctx,t.title,t.tfam,t.tbold,maxW,maxH,t.tlh,maxSize*t.tscale,minSize,t.tls); }
function titleOpts(f){
  if(!FX.type) return {};
  const total=f.lines.join(" ").length; const k=Math.min(1,FX.t/0.7);
  return {reveal:Math.floor(total*k), cursor: k<1 || Math.floor(FX.t*8)%2===0};
}
function decosList(t,max){ return state.decos.slice(0,Math.min(max,t.ndeco)); }
function drawKicker(ctx,t,x,y,s,col,align="left"){
  if(!t.kicker) return 0; const fs=s*0.034; font(ctx,fs,FH,true); ctx.fillStyle=col.acc; ctx.textAlign=align;
  const txt=t.kicker.toUpperCase(), w=ctx.measureText(txt).width;
  beginEl(ctx,"kicker"); ctx.fillText(txt,x,y+fs*0.85); addBox(align==="center"?x-w/2:align==="right"?x-w:x,y,w,fs*1.1); endEl(ctx);
  ctx.textAlign="left"; return fs*1.6;
}
function footerText(ctx,txt,x,y,fs,color,align){
  font(ctx,fs,FH,true); ctx.fillStyle=color; ctx.textAlign=align; ctx.fillText(txt,x,y);
  const w=ctx.measureText(txt).width; addBox(align==="center"?x-w/2:align==="right"?x-w:x,y-fs*0.85,w,fs*1.1); ctx.textAlign="left";
}
/* wrap a group of drawing calls into a movable element */
async function el(ctx,key,fn){ beginEl(ctx,key); try{ return await fn(); } finally { endEl(ctx); } }

/* ================= Templates ================= */
async function tplTalk(ctx,W,H,col,t){
  const s=Math.min(W,H), m=s*0.075, wide=W/H>1.25, ultra=W/H>2.2, tall=H/W>1.5;
  const k = tall?1.3:(ultra?1.5:1);
  let y=m;
  const lh0=s*(ultra?0.26:0.14), L=logoSize(lh0);
  if(L.w) await el(ctx,"logo",()=>drawLogo(ctx,W-m,m,lh0,col,"right"));
  const reserveRight = L.w ? L.w+m*0.6 : 0;
  const decos=ultra?[]:decosList(t,wide?6:5);
  const bs = s*0.12*t.dscale;
  let bottom=H-m;
  if(t.footer){ const fs=s*0.03; await el(ctx,"footer",()=>footerText(ctx,t.footer,t.center?W/2:m,bottom,fs,col.acc,t.center?"center":"left")); bottom-=fs*1.9; }
  if(decos.length){
    const n=decos.length, gap=n>1?(W-2*m-n*bs)/(n-1):0, x0 = n===1&&t.center ? W/2-bs/2 : m;
    await el(ctx,"decos",async()=>{ for(let i=0;i<n;i++) await decoBox(ctx,decos[i],x0+i*(bs+gap),bottom-bs,bs,col, i%2? col.ink : null, i); });
    bottom-=bs+m*0.7;
  }
  const tx = t.center ? W/2 : m, al = t.center?"center":"left";
  const titleW = t.center ? W-2*m-2*reserveRight : W-2*m-reserveRight;
  y+=drawKicker(ctx,t,tx,y,s,col,al);
  if(t.title){
    const titleMaxH = (bottom-y)*(wide||tall?0.42:0.38);
    const f = fitTitle(ctx,t,titleW,titleMaxH,s*0.2*k,s*0.03);
    await el(ctx,"title",()=>drawLines(ctx,f,tx,y-f.size*0.08,col.ink,al,titleOpts(f)));
    y+=f.height+s*0.045;
  }
  if(L.w && y<m+L.h+s*0.03) y=m+L.h+s*0.03;
  const twoCol = wide && !t.center;
  const leftW = twoCol ? (W-2*m)*0.32 : W-2*m;
  let ly=y;
  if(t.subtitle){ const sf=fit(ctx,t.subtitle,FH,true,leftW,s*0.16*k,1.3,s*0.042*k,s*0.018); await el(ctx,"subtitle",()=>drawLines(ctx,sf,tx,ly,col.acc,al,{underline:t.underline})); ly+=sf.height+s*0.03; }
  const ts=s*0.042*Math.min(k,1.25);
  if(t.tag||t.tag2){
    await el(ctx,"labels",()=>{
      if(t.center){ font(ctx,ts,FJ); const w=(t.tag?ctx.measureText(t.tag).width+ts*1.4:0)+(t.tag2?ctx.measureText(t.tag2).width+ts*0.9:0); ly+=tagsRow(ctx,t,W/2-w/2,ly,ts,col,W-2*m,false)+s*0.03; }
      else ly+=tagsRow(ctx,t,m,ly,ts,col,leftW,twoCol)+s*0.03;
    });
  }
  if(t.body){
    const bx = twoCol ? m+leftW+s*0.05 : m, by = twoCol ? y : ly+s*0.01;
    const bw = (twoCol ? W-m-bx : W-2*m) - (t.center?0:s*0.06), bh = bottom-by;
    if(bh>s*0.04){
      const bf=fit(ctx,t.body,FH,false,bw,bh,1.35,s*0.036*k*t.bscale,s*0.014);
      await el(ctx,"body",()=>drawLines(ctx,bf,t.center?W/2:bx,by,col.ink,al));
      if(!t.center && shown("bracket")) await el(ctx,"bracket",()=>bracket(ctx,W-m,by,Math.min(bh,Math.max(bf.height,s*0.15)),s,col.ink));
    }
  }
}

async function tplBanner(ctx,W,H,col,t){
  const s=Math.min(W,H), m=s*0.08, land=W/H>1.15;
  const box=s*(land?0.19:0.16)*t.dscale, lw=Math.max(2,s*0.005);
  const d=decosList(t,8); const list=d.length?d:[null];
  const slot=i=> list[i%list.length];
  if(shown("decos")) await el(ctx,"decos",async()=>{
    if(land){
      const gap=(H-2*m-3*box)/2;
      for(let i=0;i<3;i++){
        await decoBox(ctx,slot(i),m,m+i*(box+gap),box,col, i===1?col.acc:col.ink, i);
        await decoBox(ctx,slot(i+3),W-m-box,m+i*(box+gap),box,col, i===1?col.acc:col.ink, i+3);
      }
    } else {
      const gap=(W-2*m-3*box)/2;
      for(let i=0;i<3;i++){
        await decoBox(ctx,slot(i),m+i*(box+gap),m,box,col, i===1?col.acc:col.ink, i);
        await decoBox(ctx,slot(i+3),m+i*(box+gap),H-m-box,box,col, i===1?col.acc:col.ink, i+3);
      }
    }
  });
  const inner = land ? {x:m+box+m, w:W-2*(m+box+m), y:m, h:H-2*m} : {x:m, w:W-2*m, y:m+box+m*0.7, h:H-2*(m+box+m*0.7)};
  const rw=inner.w*0.6, rx=W/2-rw/2, rh=s*0.04, n=11;
  const ry = land ? inner.y + rh*0.2 : inner.y;
  const by = land ? inner.y+inner.h-rh*0.2 : inner.y+inner.h;
  if(shown("rulers")) await el(ctx,"rulers",()=>{
    ctx.strokeStyle=col.acc; ctx.lineWidth=lw; ctx.fillStyle=col.acc;
    const lit = FX.on ? Math.floor(FX.t*n*2)%(n+1) : -1;   // "loading bar" when animated
    for(let i=0;i<n;i++){ ctx.strokeRect(rx+i*rw/n,ry,rw/n,rh); if(i<lit) ctx.fillRect(rx+i*rw/n,ry,rw/n,rh); }
    ctx.beginPath(); ctx.moveTo(rx,by-rh); ctx.lineTo(rx,by); ctx.lineTo(rx+rw,by); ctx.lineTo(rx+rw,by-rh);
    for(let i=1;i<8;i++){ const x=rx+i*rw/8; ctx.moveTo(x,by); ctx.lineTo(x,by-rh*(i%2?0.5:1)); } ctx.stroke();
    addBox(rx,ry,rw,rh); addBox(rx,by-rh,rw,rh);
  });
  const cy0=ry+rh+s*0.06, cy1=by-rh-s*0.06, ch=cy1-cy0;
  const kind=logoKind(), hasLogo=kind!=="none";
  const subH = t.subtitle ? s*0.06 : 0, kick = t.kicker? s*0.05:0;
  const gH = ch - subH - kick;
  const lsz=+$("lsize").value/100;
  const bannerT = {...t, tfam: $("tfont").value==="jersey"?FH:t.tfam, tbold: $("tfont").value==="hack"?false:true, tlh:1.12};
  if(land && W/H>1.5 && hasLogo){
    const lh=Math.min(gH*0.85, inner.w*0.32*1.3)*lsz;
    const lW=lh*logoRatio(kind);
    const tw=Math.max(inner.w*0.3, inner.w-lW-s*0.06);
    const f=fitTitle(ctx,bannerT,tw,Math.min(gH,lh*0.95),lh*0.32,s*0.02);
    const total=lW+(t.title?s*0.05+f.width:0), x0=W/2-total/2, gy=cy0+kick+(gH-lh)/2;
    if(kick) drawKicker(ctx,t,W/2,cy0+(gH-lh)/2,s,col,"center");
    await el(ctx,"logo",()=>drawLogo(ctx,x0,gy,lh/lsz,col,"left"));
    if(t.title) await el(ctx,"title",()=>drawLines(ctx,f,x0+lW+s*0.05,gy+lh/2-f.height/2,col.ink,"left",titleOpts(f)));
    if(t.subtitle){ const sf=fit(ctx,t.subtitle,FH,false,inner.w,subH,1.2,s*0.04*t.bscale,s*0.015); await el(ctx,"subtitle",()=>drawLines(ctx,sf,W/2,gy+lh+s*0.03,col.acc,"center")); }
  } else {
    const lh = hasLogo ? gH*0.45*lsz : 0;
    const f=fitTitle(ctx,bannerT,inner.w,gH-lh-s*0.04,s*0.11,s*0.02);
    const total=kick+lh+(hasLogo?s*0.04:0)+(t.title?f.height:0)+(t.subtitle?subH:0);
    let gy=cy0+(ch-total)/2;
    if(kick){ gy+=drawKicker(ctx,t,W/2,gy,s,col,"center"); }
    if(hasLogo){ const yy=gy; await el(ctx,"logo",()=>drawLogo(ctx,W/2,yy,lh/lsz,col,"center")); gy+=lh+s*0.04; }
    if(t.title){ const yy=gy; await el(ctx,"title",()=>drawLines(ctx,f,W/2,yy,col.ink,"center",titleOpts(f))); gy+=f.height+s*0.015; }
    if(t.subtitle){ const sf=fit(ctx,t.subtitle,FH,false,inner.w,subH,1.2,s*0.04*t.bscale,s*0.015); const yy=gy; await el(ctx,"subtitle",()=>drawLines(ctx,sf,W/2,yy,col.acc,"center")); }
  }
}

async function tplPoster(ctx,W,H,col,t){
  const s=Math.min(W,H), m=s*0.07, ultra=W/H>2.2, land=W/H>1.2;
  let bottom=H-m;
  const pat = t.pattern || "Patterns/Pattern0.svg";
  const ph = ultra||!shown("pattern") ? 0 : (land ? H*0.17 : H*0.15)*(+$("pscale").value/100);
  if(ph){ await el(ctx,"pattern",()=>patternBand(ctx,pat,0,H-ph,W,ph,col)); bottom=H-ph-m*0.6; }
  const lh=s*(ultra?0.25:0.12);
  const L=logoSize(lh);
  if(L.w) await el(ctx,"logo",()=>drawLogo(ctx,m,m,lh,col,"left"));
  let footW=0;
  if(t.footer){ const fs=s*0.032;
    await el(ctx,"footer",()=>{ font(ctx,fs,FH,true); const fl=wrap(ctx,t.footer,Math.max(W*0.4,W-2*m-L.w-s*0.06));
      fl.forEach((l,i)=>footerText(ctx,l,W-m,m+fs*(1+i*1.3),fs,col.acc,"right")); font(ctx,fs,FH,true); footW=Math.max(...fl.map(l=>ctx.measureText(l).width)); }); }
  const top=m+Math.max(L.h,s*0.04)+s*0.05;
  if(land && !ultra){
    const ds=lh*0.6*t.dscale, x0=m+L.w+s*0.06, x1=W-m-footW-s*0.06;
    const n=Math.min(t.ndeco,state.decos.length,Math.max(0,Math.floor((x1-x0)/(ds*1.5))));
    if(n) await el(ctx,"decos",async()=>{ for(let i=0;i<n;i++) await drawDeco(ctx,state.decos[i],x0+i*ds*1.5,m+lh-ds,ds,ds,col,i); });
  } else if(!ultra){
    const ds=s*0.065*t.dscale, decos=decosList(t,Math.floor((W-2*m)/(ds*1.6)));
    if(decos.length){ const b0=bottom; await el(ctx,"decos",async()=>{ for(let i=0;i<decos.length;i++) await drawDeco(ctx,decos[i],W-m-(i+1)*ds*1.5+ds*0.5,b0-ds,ds,ds,col,i); }); bottom-=ds+m*0.5; }
  }
  const ts=s*0.04;
  const colW = land ? (W-2*m)*0.42 : W-2*m;
  let sf=null; if(t.subtitle){ sf=fit(ctx,t.subtitle,FH,true,colW,s*0.12,1.3,s*0.045,s*0.016); }
  const tagsH = (t.tag||t.tag2) ? ts*1.35 : 0;
  const leftH = (sf?sf.height+s*0.03:0) + tagsH;
  let bf=null;
  const bodyW = land ? (W-2*m)*0.52 : Math.min(W-2*m, s*1.1);
  if(t.body) bf=fit(ctx,t.body,FH,false,bodyW,s*(ultra?0.12:(land?0.2:0.16)),1.35,s*0.032*t.bscale,s*0.014);
  const blockH = land ? Math.max(leftH, bf?bf.height:0) : leftH + (bf? bf.height+s*0.03 : 0);
  const kick = t.kicker ? s*0.055 : 0;
  const avail=bottom-top-blockH-s*0.05-kick;
  const tf=fitTitle(ctx,t,W-2*m,avail,s*0.3,s*0.03);
  let y=top+(avail-(t.title?tf.height:0))*0.35;
  const tx=t.center?W/2:m, al=t.center?"center":"left";
  y+=drawKicker(ctx,t,tx,y,s,col,al);
  if(t.title){ const yy=y; await el(ctx,"title",()=>drawLines(ctx,tf,tx,yy-tf.size*0.08,col.ink,al,titleOpts(tf))); y+=tf.height+s*0.05; }
  const by=y;
  if(sf){ const yy=y; await el(ctx,"subtitle",()=>drawLines(ctx,sf,m,yy,col.acc,"left",{underline:t.underline})); y+=sf.height+s*0.03; }
  if(tagsH){ const yy=y; await el(ctx,"labels",()=>tagsRow(ctx,t,m,yy,ts,col,colW,false)); y+=tagsH+s*0.03; }
  if(bf){ const yy=y; await el(ctx,"body",()=>{ if(land) drawLines(ctx,bf,W-m-bodyW,by,col.ink); else drawLines(ctx,bf,m,yy,col.ink); }); }
}

async function tplQuote(ctx,W,H,col,t){
  const s=Math.min(W,H), m=s*0.08, land=W/H>1.2;
  const lh=s*0.11; const L=logoSize(lh);
  if(L.w) await el(ctx,"logo",()=>drawLogo(ctx,W-m,m,lh,col,"right"));
  const qs=s*(land?0.3:0.22);
  if(shown("quote")) await el(ctx,"quote",()=>{ font(ctx,qs,FJ); ctx.fillStyle=col.acc; ctx.fillText("“",m-qs*0.04,m+qs*0.62); addBox(m,m+qs*0.08,qs*0.42,qs*0.36); });
  let bottom=H-m;
  if(t.footer){ const fs=s*0.03; const b0=bottom; await el(ctx,"footer",()=>footerText(ctx,t.footer,m,b0,fs,col.acc,"left")); bottom-=fs*2; }
  const d=t.avatar;
  const cs = s*(land?0.34:0.22)*t.dscale;
  let textR=W-m;
  if(d){
    if(land){ await el(ctx,"avatar",()=>decoBox(ctx,d,W-m-cs,H-m-cs,cs,col,col.ink,0)); textR=W-m-cs-s*0.06; }
    else { await el(ctx,"avatar",()=>decoBox(ctx,d,W-m-cs,H-m-cs,cs,col,col.ink,0)); bottom=Math.min(bottom,H-m-cs-s*0.04); }
  }
  const top=m+qs*0.6;
  const sub = t.subtitle ? "— "+t.subtitle : "";
  let sf=null; if(sub) sf=fit(ctx,sub,FH,true,textR-m,s*0.1,1.3,s*0.045*t.bscale,s*0.016);
  const tagH=(t.tag||t.tag2)? s*0.04*1.35+s*0.03 : 0;
  const avail=bottom-top-(sf?sf.height+s*0.04:0)-tagH-s*0.03;
  const f=fitTitle(ctx,t,textR-m,avail,s*0.16,s*0.025);
  let y=top+(avail-(t.title?f.height:0))*0.4;
  if(t.title){ const yy=y; await el(ctx,"title",()=>drawLines(ctx,f,m,yy,col.ink,"left",titleOpts(f))); y+=f.height+s*0.04; }
  if(sf){ const yy=y; await el(ctx,"subtitle",()=>drawLines(ctx,sf,m,yy,col.acc,"left",{underline:t.underline})); y+=sf.height+s*0.03; }
  if(tagH){ const yy=y; await el(ctx,"labels",()=>tagsRow(ctx,t,m,yy,s*0.04,col,textR-m,false)); }
}

async function tplBadge(ctx,W,H,col,t){
  const s=Math.min(W,H), m=s*0.07, land=W/H>1.2;
  const bandH=shown("band") ? H*(land?0.22:0.2) : 0;
  const bcol={bg:col.acc,ink:col.bg,acc:col.bg};
  const L=logoSize(bandH?bandH*0.62:s*0.12);
  if(bandH){
    await el(ctx,"band",()=>{
      ctx.fillStyle=col.acc; ctx.fillRect(0,0,W,bandH); addBox(0,0,W,bandH);
      const kick=(t.kicker||"HELLO, MY NAME IS").toUpperCase();
      const kf=fit(ctx,kick,FJ,false,W-2*m-L.w-s*0.04,bandH*0.7,0.95,bandH*0.42,s*0.02);
      drawLines(ctx,kf,m,bandH/2-kf.height/2-kf.size*0.05,col.bg,"left");
    });
  }
  if(L.w) await el(ctx,"logo",()=>bandH ? drawLogo(ctx,W-m,bandH*0.19,bandH*0.62,bcol,"right") : drawLogo(ctx,W-m,m,s*0.12,col,"right"));
  let bottom=H-m;
  if(t.footer){ const fh=s*0.075; await el(ctx,"footer",()=>{ ctx.fillStyle=col.ink; ctx.fillRect(0,H-fh,W,fh); addBox(0,H-fh,W,fh); footerText(ctx,t.footer,W/2,H-fh/2+fh*0.42*0.36,fh*0.42,col.bg,"center"); }); bottom=H-fh-m*0.7; }
  const d=t.avatar;
  let top=(bandH||m+L.h)+m;
  let nameW=W-2*m;
  const av=Math.min(s*(land?0.42:0.3)*t.dscale, (bottom-top)*(land?0.8:0.36));
  if(d){
    if(land){ const yy=top+(bottom-top-av)/2; await el(ctx,"avatar",()=>decoBox(ctx,d,W-m-av,yy,av,col,col.ink,0)); nameW=W-2*m-av-s*0.05; }
    else { const yy=top; await el(ctx,"avatar",()=>decoBox(ctx,d,W/2-av/2,yy,av,col,col.ink,0)); top+=av+m*0.6; }
  }
  const center=!land;
  const tx=center?W/2:m, al=center?"center":"left";
  let sf=null; if(t.subtitle) sf=fit(ctx,t.subtitle,FH,true,nameW,s*0.1,1.3,s*0.05*t.bscale,s*0.016);
  let bf=null; if(t.body) bf=fit(ctx,t.body,FH,false,nameW,s*0.14,1.35,s*0.03*t.bscale,s*0.012);
  const tagH=(t.tag||t.tag2)? s*0.04*1.35+s*0.03 : 0;
  const rest=(sf?sf.height+s*0.03:0)+(bf?bf.height+s*0.03:0)+tagH;
  const f=fitTitle(ctx,t,nameW,bottom-top-rest-s*0.03,s*0.24,s*0.03);
  let y=top+(bottom-top-rest-(t.title?f.height:0))*0.45;
  if(t.title){ const yy=y; await el(ctx,"title",()=>drawLines(ctx,f,tx,yy-f.size*0.06,col.ink,al,titleOpts(f))); y+=f.height+s*0.03; }
  if(sf){ const yy=y; await el(ctx,"subtitle",()=>drawLines(ctx,sf,tx,yy,col.acc,al,{underline:t.underline})); y+=sf.height+s*0.03; }
  if(tagH){ const yy=y; await el(ctx,"labels",()=>{ if(center){ font(ctx,s*0.04,FJ); const w=(t.tag?ctx.measureText(t.tag).width+s*0.04*1.4:0)+(t.tag2?ctx.measureText(t.tag2).width+s*0.04*0.9:0); tagsRow(ctx,t,W/2-w/2,yy,s*0.04,col,nameW,false);} else tagsRow(ctx,t,m,yy,s*0.04,col,nameW,false); }); y+=tagH; }
  if(bf){ const yy=y; await el(ctx,"body",()=>drawLines(ctx,bf,tx,yy,col.ink,al)); }
}

/* Logo template: the Logo maker cube, alone */
function logoColors(col){
  const src=$("lgColSrc").value;
  if(src==="custom") return {color:$("lgCol").value, capColor:$("lgCapCol").value};
  if(src==="acc") return {color:col.acc, capColor:col.ink};
  return {color:col.ink, capColor:col.ink};
}
async function tplLogo(ctx,W,H,col){
  if(!shown("logo")) return;
  const fitMode=$("format").value==="fit";
  const m = fitMode ? 0 : Math.min(W,H)*0.12;
  const o={...logoOpts(), ...logoColors(col), bg:null};
  const ratio=(()=>{ const c=buildLogo(o,100); return c.width/c.height; })();
  let h=H-2*m, w=h*ratio; if(w>W-2*m){ w=W-2*m; h=w/ratio; }
  const pulse = FX.pulse ? 1+Math.sin(FX.t*Math.PI*2)*0.06 : 1;
  await el(ctx,"logo",()=>{
    ctx.save(); ctx.translate(W/2,H/2); ctx.scale(pulse,pulse);
    ctx.drawImage(buildLogo(o,Math.ceil(h)),-w/2,-h/2,w,h); ctx.restore(); addBox(W/2-w/2,H/2-h/2,w,h);
  });
}

/* ================= Background, texture, frame ================= */
function transparentBg(){ return state.tpl==="logo" && $("lgTransp").checked; }
async function background(ctx,W,H,col,t){
  if(!transparentBg()){ ctx.fillStyle=col.bg; ctx.fillRect(0,0,W,H); }
  if(state.tpl==="logo") return;
  const s=Math.min(W,H), tex=$("texture").value;
  ctx.save(); ctx.globalAlpha=0.13; ctx.strokeStyle=col.ink; ctx.fillStyle=col.ink; ctx.lineWidth=Math.max(1,s/900);
  if(tex==="grid"){ const g=s/18; ctx.beginPath(); for(let x=g;x<W;x+=g){ctx.moveTo(x,0);ctx.lineTo(x,H);} for(let y=g;y<H;y+=g){ctx.moveTo(0,y);ctx.lineTo(W,y);} ctx.stroke(); }
  if(tex==="dots"){ const g=s/30, r=Math.max(1.2,s/500); for(let x=g/2;x<W;x+=g) for(let y=g/2;y<H;y+=g){ ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); } }
  if(tex==="lines"){ const g=Math.max(3,s/220); for(let y=0;y<H;y+=g*2) ctx.fillRect(0,y,W,g*0.6); }
  if(tex==="zeros"){ ctx.globalAlpha=0.09; const fs=s/26; font(ctx,fs,FH); const row="0".repeat(Math.ceil(W/(fs*0.6))+2);
    for(let y=fs, i=0;y<H+fs;y+=fs*1.2,i++){ let r=row; if(i%5===2){ const p=(i*7)%(r.length-1); r=r.slice(0,p)+"4"+r.slice(p+1); } ctx.fillText(r,-(i%3)*fs*0.3,y); } }
  ctx.restore();
  if(t.pattern && state.tpl!=="poster"){
    ctx.save(); ctx.globalAlpha=+$("popac").value/100;
    const ph=s*0.28*(+$("pscale").value/100), pw=ph*ratioOf(t.pattern), off = FX.scroll ? FX.t*pw : 0;
    for(let yy=0,row=0; yy<H; yy+=ph*1.05,row++) for(let xx=-(row%2)*pw/2-off; xx<W; xx+=pw) if(xx+pw>0) await drawAsset(ctx,t.pattern,xx,yy,pw,ph,col,col.acc);
    ctx.restore();
  }
}
function frame(ctx,W,H,col){
  const f=$("frame").value; if(!f || state.tpl==="logo") return; const s=Math.min(W,H), i=s*0.028, lw=Math.max(2,s*0.004);
  ctx.strokeStyle=col.acc; ctx.lineWidth=lw;
  if(f==="border") ctx.strokeRect(i,i,W-2*i,H-2*i);
  if(f==="double"){ ctx.strokeRect(i,i,W-2*i,H-2*i); ctx.strokeRect(i*1.45,i*1.45,W-2.9*i,H-2.9*i); }
  if(f==="corners"){ const c=s*0.07; ctx.beginPath();
    [[i,i,1,1],[W-i,i,-1,1],[i,H-i,1,-1],[W-i,H-i,-1,-1]].forEach(([x,y,dx,dy])=>{ ctx.moveTo(x+dx*c,y); ctx.lineTo(x,y); ctx.lineTo(x,y+dy*c); }); ctx.stroke(); }
  if(f==="ruler"){ const n=Math.round(W/(s*0.035)), st=W/n; ctx.beginPath();
    for(let k=0;k<=n;k++){ const h=k%5===0?s*0.022:s*0.011; ctx.moveTo(k*st,0); ctx.lineTo(k*st,h); ctx.moveTo(k*st,H); ctx.lineTo(k*st,H-h); }
    const nv=Math.round(H/st); for(let k=0;k<=nv;k++){ const y=k*H/nv, h=k%5===0?s*0.022:s*0.011; ctx.moveTo(0,y); ctx.lineTo(h,y); ctx.moveTo(W,y); ctx.lineTo(W-h,y); } ctx.stroke(); }
}
function rng(seed){ return ()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; }
function postFx(ctx,W,H,col){
  const s=Math.min(W,H);
  if(FX.glitch){
    const fr=Math.floor(FX.t*FX.frames), r=rng(fr*7919+13);
    const burst = Math.floor(FX.t*5)%2===0 && r()<0.75;   // glitch comes in bursts
    if(burst){
      const src=document.createElement("canvas"); src.width=W; src.height=H; src.getContext("2d").drawImage(ctx.canvas,0,0);
      const n=3+Math.floor(r()*6);
      for(let i=0;i<n;i++){ const y=r()*H, h=s*(0.01+r()*0.07), dx=(r()-0.5)*s*0.12; ctx.drawImage(src,0,y,W,h,dx,y,W,h); }
      ctx.save(); ctx.globalAlpha=0.35; ctx.globalCompositeOperation="source-atop";
      const y=r()*H; ctx.fillStyle=col.acc; ctx.fillRect(0,y,W,s*(0.004+r()*0.02)); ctx.restore();
    }
  }
  if(FX.crt){
    ctx.save(); ctx.globalAlpha=0.16; ctx.fillStyle="#000"; const g=Math.max(2,Math.round(s/270));
    for(let y=0;y<H;y+=g*2) ctx.fillRect(0,y,W,g);
    const by=((FX.t*1.2)%1.2-0.1)*H; const gr=ctx.createLinearGradient(0,by-s*0.08,0,by+s*0.08);
    gr.addColorStop(0,"rgba(255,255,255,0)"); gr.addColorStop(.5,"rgba(255,255,255,.5)"); gr.addColorStop(1,"rgba(255,255,255,0)");
    ctx.globalAlpha=0.18; ctx.fillStyle=gr; ctx.fillRect(0,by-s*0.08,W,s*0.16); ctx.restore();
  }
}

/* ================= Render ================= */
const FX = {on:false,t:0,frames:1};
function anyFx(){ return Object.values(state.fx).some(Boolean); }
function size(){
  if($("format").value==="fit"){
    if(state.tpl!=="logo") return [1080,1080];
    const h=+$("lgSize").value, c=buildLogo({...logoOpts(),bg:null},100); return [Math.max(16,Math.round(h*c.width/c.height)), h];
  }
  if($("format").value==="custom") return [Math.max(100,Math.min(6000,+$("cw").value||1600)), Math.max(100,Math.min(6000,+$("ch").value||900))];
  return $("format").value.split("x").map(Number);
}
const TPL={talk:tplTalk,banner:tplBanner,poster:tplPoster,quote:tplQuote,badge:tplBadge,logo:tplLogo};
/* draws one frame; t in [0,1) when animated, null for the still image */
async function drawFrame(ctx,W,H,t){
  FX.on = t!=null && anyFx();
  Object.keys(FX).forEach(k=>{ if(!["on","t","frames"].includes(k)) delete FX[k]; });
  if(FX.on){ FX.t=t; Object.assign(FX,state.fx); } else FX.t=0;
  let col=state.col;
  if(FX.cycle){ const all=THEMES; col=all[Math.floor(t*all.length)%all.length]; }
  const tt=T(); BOXES={}; CW=W; CH=H; CUR=null; CUROFF={x:0,y:0}; SUP=0;
  await background(ctx,W,H,col,tt);
  await TPL[state.tpl](ctx,W,H,col,tt);
  frame(ctx,W,H,col);
  postFx(ctx,W,H,col);
}
let renderId=0;
async function render(){
  if(playing) return;   // the animation loop already redraws
  const id=++renderId; const [W,H]=size();
  const off=document.createElement("canvas"); off.width=W; off.height=H;
  await drawFrame(off.getContext("2d"),W,H,null);
  if(id!==renderId) return;
  show(off,W,H);
  $("info").textContent=`${W} × ${H} px`+(state.tpl==="logo"&&transparentBg()?" · transparent":"");
}
function show(off,W,H){
  const cv=$("cv"); if(cv.width!==W||cv.height!==H){cv.width=W; cv.height=H;}
  cv.classList.toggle("transp",transparentBg());
  lastFrame=off; lastBoxes=BOXES; if(sel&&!lastBoxes[sel]) sel=null; if(hover&&!lastBoxes[hover]) hover=null;
  cv.getContext("2d").clearRect(0,0,W,H); overlay();
}
/* preview loop */
let playing=false, busy=false, t0=0;
function togglePlay(){
  if(!playing && !anyFx()){ $("info").textContent="Tick at least one motion effect first."; return; }
  playing=!playing; $("play").textContent=playing?"■ Stop":"▶ Preview";
  if(playing){ t0=performance.now(); requestAnimationFrame(loop); } else render();
}
async function loop(now){
  if(!playing) return;
  if(!busy){
    busy=true; const dur=+$("dur").value*1000; const t=((now-t0)%dur)/dur; const [W,H]=size();
    FX.frames=Math.round(+$("dur").value*+$("fps").value);
    const tq=Math.floor(t*FX.frames)/FX.frames;   // same frames as the export
    const off=document.createElement("canvas"); off.width=W; off.height=H;
    await drawFrame(off.getContext("2d"),W,H,tq); if(playing) show(off,W,H);
    $("info").textContent=`${W} × ${H} px · previewing ${$("dur").value}s loop`;
    busy=false;
  }
  requestAnimationFrame(loop);
}

/* ================= Export ================= */
function fname(ext){ const s=(state.tpl==="logo" ? "logo-"+$("lgLeft").value+$("lgRight").value : $("title").value||"visual").toLowerCase().normalize("NFD").replace(/[^\w]+/g,"-").replace(/^-|-$/g,"").slice(0,40); return `40c3-${s||"visual"}.${ext}`; }
function saveBlob(b,name){ const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); }
async function stillCanvas(){ const [W,H]=size(); const c=document.createElement("canvas"); c.width=W; c.height=H; await drawFrame(c.getContext("2d"),W,H,null); return c; }
async function download(fmt){
  const c=await stillCanvas();
  const out = fmt==="jpg" ? flatten(c) : c;
  out.toBlob(b=>{ if(b) saveBlob(b,fname(fmt==="jpg"?"jpg":"png")); else $("info").textContent="Export failed: image too big for this browser."; }, fmt==="jpg"?"image/jpeg":"image/png", 0.93);
}
/* JPG / GIF / video have no transparency: put the palette background behind */
function flatten(c){
  if(!transparentBg()) return c; const o=document.createElement("canvas"); o.width=c.width; o.height=c.height;
  const x=o.getContext("2d"); x.fillStyle=state.col.bg; x.fillRect(0,0,o.width,o.height); x.drawImage(c,0,0); return o;
}
async function copyImg(){
  const c=await stillCanvas();
  c.toBlob(async b=>{
    try{ await navigator.clipboard.write([new ClipboardItem({"image/png":b})]); $("copy").textContent="Copied!"; }
    catch(e){ $("copy").textContent="Copy not allowed here"; }
    setTimeout(()=>$("copy").textContent="Copy image",1800);
  },"image/png");
}
function progress(p,txt){ const b=$("bar"); b.style.display=p==null?"none":"block"; if(p!=null) b.firstChild.style.width=(p*100).toFixed(1)+"%"; if(txt) $("info").textContent=txt; }
const tick=()=>new Promise(r=>setTimeout(r,0));
async function exportGif(){
  if(!anyFx()){ $("info").textContent="Tick at least one motion effect (Motion section) to make a GIF."; return; }
  if(!window.gifenc){ $("info").textContent="GIF encoder not available."; return; }
  const wasPlaying=playing; if(playing) togglePlay();
  const btn=$("gif"); btn.disabled=true;
  try{
    const [W,H]=size(), sc=+$("gscale").value, w=Math.round(W*sc), h=Math.round(H*sc);
    const fps=+$("fps").value, n=Math.max(2,Math.round(+$("dur").value*fps)); FX.frames=n;
    const {GIFEncoder,quantize,applyPalette}=window.gifenc; const gif=GIFEncoder();
    const big=document.createElement("canvas"); big.width=W; big.height=H; const bctx=big.getContext("2d");
    const small=document.createElement("canvas"); small.width=w; small.height=h; const sctx=small.getContext("2d",{willReadFrequently:true});
    for(let i=0;i<n;i++){
      await drawFrame(bctx,W,H,i/n);
      sctx.clearRect(0,0,w,h); sctx.drawImage(flatten(big),0,0,w,h);
      const data=sctx.getImageData(0,0,w,h).data;
      const pal=quantize(data,256); const idx=applyPalette(data,pal);
      gif.writeFrame(idx,w,h,{palette:pal,delay:Math.round(1000/fps)});
      progress((i+1)/n,`Encoding GIF… frame ${i+1}/${n}`); await tick();
    }
    gif.finish(); const b=new Blob([gif.bytes()],{type:"image/gif"}); saveBlob(b,fname("gif"));
    progress(null,`GIF ready · ${w}×${h} px · ${n} frames · ${(b.size/1048576).toFixed(1)} MB`);
  }catch(e){ console.error(e); progress(null,"GIF export failed: "+e.message); }
  btn.disabled=false; if(wasPlaying) togglePlay(); else { const msg=$("info").textContent; await render(); $("info").textContent=msg; }
}
async function exportVideo(){
  if(!anyFx()){ $("info").textContent="Tick at least one motion effect (Motion section) to make a video."; return; }
  if(!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream){ $("info").textContent="Video recording is not supported by this browser."; return; }
  const types=["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
  const mime=types.find(t=>MediaRecorder.isTypeSupported(t)); if(!mime){ $("info").textContent="No video format available in this browser."; return; }
  const wasPlaying=playing; if(playing) togglePlay();
  const btn=$("video"); btn.disabled=true;
  try{
    const [W,H]=size(); const fps=+$("fps").value, loops=2, n=Math.round(+$("dur").value*fps); FX.frames=n;
    // pre-render all frames first so playback timing is exact
    const frames=[]; const tmp=document.createElement("canvas"); tmp.width=W; tmp.height=H; const tctx=tmp.getContext("2d");
    for(let i=0;i<n;i++){ await drawFrame(tctx,W,H,i/n); frames.push(await createImageBitmap(flatten(tmp))); progress((i+1)/n*0.5,`Rendering frame ${i+1}/${n}…`); await tick(); }
    const rec=document.createElement("canvas"); rec.width=W; rec.height=H; const rctx=rec.getContext("2d");
    rctx.drawImage(frames[0],0,0);
    const stream=rec.captureStream(fps); const mr=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Math.min(16e6,W*H*fps*0.25)});
    const chunks=[]; mr.ondataavailable=e=>e.data.size&&chunks.push(e.data);
    const done=new Promise(r=>mr.onstop=r);
    mr.start();
    const total=n*loops, start=performance.now();
    for(let i=0;i<total;i++){
      rctx.drawImage(frames[i%n],0,0);
      progress(0.5+(i+1)/total*0.5,`Recording video… ${Math.ceil((total-i)/fps)} s left`);
      const target=start+(i+1)*1000/fps; await new Promise(r=>setTimeout(r,Math.max(0,target-performance.now())));
    }
    mr.stop(); await done;
    const ext=mime.startsWith("video/mp4")?"mp4":"webm"; const b=new Blob(chunks,{type:mime.split(";")[0]});
    saveBlob(b,fname(ext)); progress(null,`Video ready · ${ext.toUpperCase()} · ${W}×${H} px · ${(b.size/1048576).toFixed(1)} MB (the loop plays twice)`);
  }catch(e){ console.error(e); progress(null,"Video export failed: "+e.message); }
  btn.disabled=false; if(wasPlaying) togglePlay(); else { const msg=$("info").textContent; await render(); $("info").textContent=msg; }
}

/* ================= Logo maker ================= */
function logoOpts(){
  return {left:$("lgLeft").value, right:$("lgRight").value, font:$("lgFont").value, style:$("lgStyle").value, gap:+$("lgGap").value/10,
    eye:$("lgEye").value, rays:+$("lgRays").value, caption:$("lgCap").value, layout:$("lgLayout").value, capScale:+$("lgCapSize").value/100,
    ...logoColors(state.col), bg:null};
}
const glyphCache=new Map();
function glyph(ch,fontKind){
  const key=ch+"|"+fontKind; if(glyphCache.has(key)) return glyphCache.get(key);
  const c=document.createElement("canvas"), x=c.getContext("2d"), fs=320;
  const f = fontKind==="jersey" ? `${fs}px "Jersey 10"` : `700 ${fs}px "Hack"`;
  x.font=f; const m=x.measureText(ch);
  const l=Math.ceil(m.actualBoundingBoxLeft), r=Math.ceil(m.actualBoundingBoxRight), a=Math.ceil(m.actualBoundingBoxAscent), d=Math.ceil(m.actualBoundingBoxDescent);
  c.width=Math.max(1,l+r); c.height=Math.max(1,a+d); x.font=f; x.fillStyle="#fff"; x.fillText(ch,l,a);
  glyphCache.set(key,c); return c;
}
const SLOPE=0.5775, FACE_TOP=33.8, FACE_H=36.67, FACE_W=31.08, RIGHT_X=36.57;
function buildLogo(o,outH){
  // layout in logo units (official icon = 67.65 × 88.42)
  const IW=67.65, IH=88.42;
  const capLines = o.layout==="none" ? [] : o.caption.split("\n").filter((l,i,a)=>l.length||i<a.length-1);
  const cs=IH*0.2*o.capScale, clh=1.08;
  const meas=document.createElement("canvas").getContext("2d"); meas.font=`700 ${cs}px "Hack"`;
  const capW=capLines.length? Math.max(...capLines.map(l=>meas.measureText(l).width)) : 0, capH=capLines.length*cs*clh;
  const pad = o.bg ? 10 : 2;
  let TW, TH, ix, iy, cx, cy, calign;
  if(!capLines.length){ TW=IW; TH=IH; ix=0; iy=0; }
  else if(o.layout==="right"){ TW=IW+IW*0.14+capW; TH=Math.max(IH,capH); ix=0; iy=(TH-IH)/2; cx=IW*1.14; cy=TH/2-capH/2+IH*0.03; calign="left"; }
  else { TW=Math.max(IW,capW); TH=IH+IH*0.1+capH; ix=(TW-IW)/2; iy=0; cx=TW/2; cy=IH*1.1; calign="center"; }
  TW+=2*pad; TH+=2*pad; ix+=pad; iy+=pad; if(cx!=null){ cx+=pad; cy+=pad; }
  const k=outH/TH; const c=document.createElement("canvas"); c.width=Math.max(1,Math.round(TW*k)); c.height=Math.max(1,Math.round(outH));
  const x=c.getContext("2d");
  // icon on its own layer (cut-outs must not punch the background)
  const L=document.createElement("canvas"); L.width=c.width; L.height=c.height; const g=L.getContext("2d");
  g.setTransform(k,0,0,k,ix*k,iy*k); g.fillStyle=o.color;
  // top: rhombus + rays
  g.beginPath(); g.moveTo(0,27.35); g.lineTo(33.82,7.8); g.lineTo(67.65,27.35); g.lineTo(33.82,47.01); g.closePath(); g.fill();
  const rays=[];
  if(o.rays>=1) rays.push([[31.55,0],[36.1,0],[36.1,10],[31.55,10]]);
  if(o.rays>=3) rays.push([[51.97,18.24],[58.31,11.9],[55.09,8.68],[47.9,15.87]],[[15.68,18.25],[9.34,11.91],[12.56,8.69],[19.75,15.88]]);
  if(o.rays>=5) rays.push([[61.5,24.6],[67.4,21.9],[66.2,18.4],[59.6,21.3]],[[6.15,24.6],[0.25,21.9],[1.45,18.4],[8.05,21.3]]);
  rays.forEach(p=>{ g.beginPath(); p.forEach(([a,b],i)=>i?g.lineTo(a,b):g.moveTo(a,b)); g.closePath(); g.fill(); });
  // eye cut-out
  const ex=33.82, ey=27.36;
  g.save(); g.globalCompositeOperation="destination-out"; g.beginPath();
  if(o.eye==="eye"||o.eye==="pupil") g.arc(ex,ey,10.16,0,7);
  if(o.eye==="dot") g.arc(ex,ey,5.2,0,7);
  if(o.eye==="diamond"){ g.moveTo(ex,ey-9); g.lineTo(ex+13,ey); g.lineTo(ex,ey+9); g.lineTo(ex-13,ey); }
  if(o.eye==="star"){ for(let i=0;i<8;i++){ const r=i%2?3.4:11, a=i*Math.PI/4-Math.PI/2; g.lineTo(ex+Math.cos(a)*r,ey+Math.sin(a)*r*0.85); } }
  if(o.eye==="x"){ const r=8,w=2.4; [[1,1],[1,-1]].forEach(([a,b])=>{ g.moveTo(ex-r+w*b*0.7,ey-r*b*0.75-w*0.7); g.lineTo(ex+r+w*b*0.7,ey+r*b*0.75-w*0.7); g.lineTo(ex+r-w*b*0.7,ey+r*b*0.75+w*0.7); g.lineTo(ex-r-w*b*0.7,ey-r*b*0.75+w*0.7); g.closePath(); }); }
  if(o.eye==="heart"){ g.moveTo(ex,ey+8); g.bezierCurveTo(ex-15,ey-1,ex-7,ey-12,ex,ey-4); g.bezierCurveTo(ex+7,ey-12,ex+15,ey-1,ex,ey+8); }
  g.fill(); g.restore();
  if(o.eye==="pupil"){ g.beginPath(); g.arc(ex,ey,4.6,0,7); g.fill(); }
  // faces
  const faces=[{x0:0,slope:SLOPE,txt:[...o.left]},{x0:RIGHT_X,slope:-SLOPE,txt:[...o.right]}];
  for(const f of faces){
    const top = xx => f.slope>0 ? FACE_TOP+SLOPE*xx : FACE_TOP+SLOPE*(67.65-xx);
    const chars=f.txt.slice(0,4); const n=Math.max(1,chars.length), gap=chars.length>1?o.gap:0, cw=(FACE_W-(n-1)*gap)/n;
    for(let i=0;i<n;i++){
      const x0=f.x0+i*(cw+gap); const ch=chars[i];
      const block=()=>{ g.beginPath(); g.moveTo(x0,top(x0)); g.lineTo(x0+cw,top(x0+cw)); g.lineTo(x0+cw,top(x0+cw)+FACE_H); g.lineTo(x0,top(x0)+FACE_H); g.closePath(); };
      if(!ch || ch===" "){ if(ch===undefined){ block(); g.fill(); } continue; }
      const gl=glyph(ch,o.font);
      const put=(u0,v0,u1,v1)=>{ g.save(); g.transform(cw,cw*f.slope,0,FACE_H,x0,top(x0)); g.drawImage(gl,u0,v0,u1-u0,v1-v0); g.restore(); };
      if(o.style==="solid"){
        // tint the white glyph: draw into a temp layer
        const tl=tinted(gl,o.color); g.save(); g.transform(cw,cw*f.slope,0,FACE_H,x0,top(x0)); g.drawImage(tl,0,0,1,1); g.restore();
      } else {
        block(); g.fill();
        g.save(); g.globalCompositeOperation="destination-out"; put(0.16,0.1,0.84,0.9); g.restore();
        if(o.style==="outline"){ const tl=tinted(gl,o.color); g.save(); g.transform(cw,cw*f.slope,0,FACE_H,x0,top(x0)); g.drawImage(tl,0.26,0.2,0.48,0.6); g.restore(); }
      }
    }
  }
  if(o.bg){ x.fillStyle=o.bg; x.fillRect(0,0,c.width,c.height); }
  x.drawImage(L,0,0);
  if(capLines.length){
    x.setTransform(k,0,0,k,0,0); x.font=`700 ${cs}px "Hack"`; x.fillStyle=o.capColor; x.textAlign=calign; x.textBaseline="alphabetic";
    capLines.forEach((l,i)=>x.fillText(l,cx,cy+cs*0.82+i*cs*clh));
  }
  return c;
}
const tintCache=new Map();
function tinted(gl,color){
  const key=gl.width+"x"+gl.height+"|"+color+"|"+[...glyphCache.entries()].find(e=>e[1]===gl)?.[0];
  if(tintCache.has(key)) return tintCache.get(key);
  const c=document.createElement("canvas"); c.width=gl.width; c.height=gl.height; const x=c.getContext("2d");
  x.drawImage(gl,0,0); x.globalCompositeOperation="source-in"; x.fillStyle=color; x.fillRect(0,0,c.width,c.height);
  if(tintCache.size>200) tintCache.clear(); tintCache.set(key,c); return c;
}

/* ================= Init ================= */
(async function init(){
  buildUI(); setTheme(0,true);
  state.decos=DEFAULT_DECOS.filter(k=>ASSETS[k]);
  let saved=null; try{ saved=JSON.parse(localStorage.getItem(LS)||"null"); }catch(e){}
  if(saved){ try{ restore(saved); }catch(e){} }
  setTpl(state.tpl); drawDecoGrid(); $("lgCustom").hidden=$("lgColSrc").value!=="custom";
  try{ await Promise.all([document.fonts.load('40px "Jersey 10"'),document.fonts.load('40px "Hack"'),document.fonts.load('700 40px "Hack"')]); }catch(e){}
  glyphCache.clear(); tintCache.clear(); render();
})();
