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
const CATS = {"all":"All","Icons_Deco":"Icons","Boxes":"Boxes","Citizens":"Citizens","user":"Your images"};
const allDecos = Object.keys(ASSETS).filter(k=>/^(Icons_Deco|Boxes|Citizens)\//.test(k));
const patterns = Object.keys(ASSETS).filter(k=>k.startsWith("Patterns/"));
const nice = k => k.split("/").pop().replace(/\.svg$/,"").replace(/^(Icon_|Box_|Pattern_?)/,"");
const DEFAULT_DECOS = ["Icons_Deco/Chaosknoten.svg","Icons_Deco/Icon_Smiley.svg","Icons_Deco/Star.svg","Citizens/Adam.svg","Icons_Deco/Icon_Blinkenheart.svg","Icons_Deco/Icon_Cat.svg"];
const FIELDS = ["format","cw","ch","kicker","title","subtitle","body","tag","tag2","footer","tfont","align","caps","underline","tsize","tspace","bsize",
  "logo","logoCol","lsize","pattern","texture","popac","pscale","frame","dcount","dsize","dtint","dframe","dur","fps","gscale",
  "lgLeft","lgRight","lgFont","lgStyle","lgGap","lgEye","lgRays","lgCap","lgLayout","lgCapSize","lgColSrc","arrowDir","arrowStyle","lgCol","lgCapCol","lgTransp","lgSize"];
const DEFAULTS = {};
function htmlDefault(e){
  if(e.type==="checkbox") return e.defaultChecked;
  if(e.tagName==="SELECT"){ const o=[...e.options].find(o=>o.defaultSelected)||e.options[0]; return o?o.value:""; }
  return e.defaultValue;
}
function setField(id,v){ const e=$(id); if(e.type==="checkbox") e.checked=!!v; else e.value=v; }
/* elements that can be hidden / moved, per template */
const EL_NAMES = {logo:"Logo",kicker:"Kicker",title:"Title",subtitle:"Subtitle",labels:"Labels",body:"Body text",footer:"Footer",
  decos:"Decorations",pattern:"Pattern band",rulers:"Rulers",quote:"Quote mark",band:"Top band",avatar:"Avatar",arrow:"Arrow",bracket:"Bracket"};
const TPL_ELS = {
  talk:["logo","kicker","title","subtitle","labels","body","bracket","decos","footer"],
  banner:["logo","kicker","title","subtitle","decos","rulers"],
  poster:["logo","footer","decos","kicker","title","subtitle","labels","body","pattern"],
  quote:["logo","quote","title","subtitle","labels","avatar","footer"],
  badge:["band","logo","avatar","title","subtitle","labels","body","footer"],
  motto:["logo","kicker","title","subtitle","labels","body","decos","footer"],
  way:["arrow","kicker","title","subtitle","labels","body","footer","logo"],
  logo:["logo"],
};
const EL_FIELDS = {kicker:["kicker"],band:["kicker"],title:["title"],quote:["title"],subtitle:["subtitle"],labels:["tag"],body:["body"],footer:["footer"]};
const TEXT_TPL = ["talk","banner","poster","quote","badge"];
const shown = k => !state.hidden[k];

/* ================= UI ================= */
function buildUI(){
  FIELDS.forEach(id=>{ DEFAULTS[id]=htmlDefault($(id)); });
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
    if(id==="dcount") drawDecoGrid();
    if(id==="lgColSrc") $("lgCustom").hidden=$("lgColSrc").value!=="custom";
    render(); save();
  }));
  ["cBg","cInk","cAcc"].forEach((id,i)=>$(id).addEventListener("input",e=>{
    state.col[["bg","ink","acc"][i]]=e.target.value; markTheme(-1); render(); save();
  }));
  $("swapCol").onclick=()=>{ const c=state.col; [c.bg,c.ink]=[c.ink,c.bg]; syncColorInputs(); markTheme(-1); render(); save(); };
  $("randCol").onclick=()=>{ randomMix(); render(); save(); };
  $("shuffle").onclick=()=>{ shuffleDecos(); drawDecoGrid(); render(); save(); };
  $("clearDeco").onclick=()=>{ const prev=state.decos.slice(); state.decos=[]; drawDecoGrid(); render(); save(); if(prev.length) toast("All icons removed.","Undo",undo); };
  $("random").onclick=surprise; $("chaos").onclick=chaos;
  initReady();
  $("dl").onclick=()=>download("png"); $("dljpg").onclick=()=>download("jpg"); $("copy").onclick=copyImg;
  $("gif").onclick=exportGif; $("video").onclick=exportVideo; $("play").onclick=togglePlay;
  document.querySelectorAll("#fxList input").forEach(c=>c.addEventListener("change",()=>{
    state.fx[c.dataset.fx]=c.checked; save(); setPlaying(anyFx()); updPlay2();
  }));
  $("upload").onchange=e=>{ const f=e.target.files[0]; if(f) addUserImage(f); e.target.value=""; };
  $("resetTop").onclick=resetAll;
  $("fxNone").onclick=()=>{ state.fx={}; document.querySelectorAll("#fxList input").forEach(c=>c.checked=false); setPlaying(false); updPlay2(); save(); };
  $("goLogoTpl").onclick=()=>{ setTpl("logo"); setTab("content"); render(); save(); };
  $("logo").addEventListener("input",updLogoHint);
  initTabs();
  $("undo").onclick=undo; $("redo").onclick=redo;
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
  ["secText","secElements","secType","secDeco","secBg","secLogo"].forEach(id=>$(id).hidden=isLogo);
  $("secLogoMaker").hidden=!isLogo;
  $("tabBtn-icons").hidden=isLogo; if(isLogo && !$("tab-icons").hidden) setTab("content");
  // only show the text fields this template actually uses
  const used=new Set(TPL_ELS[v].flatMap(k=>EL_FIELDS[k]||[]));
  document.querySelectorAll("#secText .fld").forEach(f=>f.hidden=!used.has(f.dataset.f));
  $("titleLbl").textContent = v==="quote" ? "Quote" : v==="way" ? "Where to (big text)" : v==="badge" ? "Name" : "Title";
  $("subtitleLbl").textContent = v==="quote" ? "Who said it" : v==="way" ? "Destination / details" : v==="badge" ? "Role, pronouns…" : "Subtitle (speakers, date…)";
  const fitOpt=$("format").querySelector('option[value="fit"]'); fitOpt.disabled=!isLogo; fitOpt.hidden=!isLogo;
  if(!isLogo && $("format").value==="fit") $("format").value="1080x1080"; $("secSign").hidden=v!=="way";
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
  // undo anything Chaos! may have changed: animation, moved elements, odd fonts and logo styles
  state.fx={}; document.querySelectorAll("#fxList input").forEach(c=>c.checked=false); setPlaying(false); updPlay2();
  state.offsets[state.tpl]={}; sel=null;
  ["lgEye","lgRays","lgStyle","lgFont","arrowStyle"].forEach(id=>setField(id,DEFAULTS[id]));
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
const DECO_UI={bg:"#062006",ink:P.A,acc:P.c0};
function decoThumb(k){ const u=state.userImgs.find(u=>u.key===k); return u ? {src:u.src,t:"Your image"} : {src:svgURL(k,DECO_UI),t:nice(k)}; }
function toggleDeco(k){
  const i=state.decos.indexOf(k);
  if(i>=0) state.decos.splice(i,1);
  else { state.decos.push(k); delete state.hidden.decos; delete state.hidden.avatar;
    const dc=$("dcount"); if(state.decos.length>+dc.value && +dc.value<+dc.max) dc.value=Math.min(+dc.max,state.decos.length); }
  drawDecoGrid(); render(); save();
}
function drawDecoGrid(){
  const cat=$("decoCat").value, g=$("decos"); g.innerHTML="";
  const user=state.userImgs.map(u=>u.key);
  const keys = cat==="user" ? user : cat==="all" ? user.concat(allDecos) : allDecos.filter(k=>k.startsWith(cat+"/"));
  if(!keys.length) g.innerHTML='<div class="hint" style="grid-column:1/-1">No image yet: use “Add your image” below, or drop one on the preview.</div>';
  keys.forEach(k=>{ const {src,t}=decoThumb(k), on=state.decos.includes(k);
    const b=document.createElement("button"); b.type="button"; b.title=t; b.setAttribute("aria-pressed",on); b.classList.toggle("on",on);
    const im=document.createElement("img"); im.alt=t; im.src=src; b.appendChild(im);
    b.onclick=()=>toggleDeco(k); g.appendChild(b); });
  // selected icons, in the order they appear on the visual; click one to remove it
  const sl=$("decoSel"); sl.innerHTML=""; const shownN=+$("dcount").value;
  if(!state.decos.length) sl.innerHTML='<span class="hint" style="margin:0">Nothing selected: click icons below to add them.</span>';
  state.decos.forEach((k,i)=>{ const {src,t}=decoThumb(k);
    const b=document.createElement("button"); b.type="button"; b.className="selico"+(i>=shownN?" off":"");
    b.title=(i>=shownN?"Not shown (raise “How many”). ":"")+"Remove "+t; b.setAttribute("aria-label","Remove "+t);
    const im=document.createElement("img"); im.alt=""; im.src=src; b.appendChild(im);
    b.onclick=()=>toggleDeco(k); sl.appendChild(b); });
  updCount();
}
function updCount(){ const n=state.decos.length, sh=Math.min(n,+$("dcount").value); $("decoCount").textContent = n ? `${n} selected · ${sh} shown` : ""; }

/* ================= Persistence ================= */
const LS="40c3-generator-v3";
function snapshot(keepUser){
  const f={}; FIELDS.forEach(id=>{ const e=$(id); f[id]= e.type==="checkbox"? e.checked : e.value; });
  return {version:3, fields:f, tpl:state.tpl, theme:state.theme, col:{...state.col}, decos:state.decos.filter(k=>keepUser||!k.startsWith("user:")), fx:{...state.fx}, hidden:{...state.hidden}, offsets:JSON.parse(JSON.stringify(state.offsets))};
}
const isHex = v => typeof v==="string" && /^#[0-9a-f]{6}$/i.test(v);
function restore(s){
  if(!s||typeof s!=="object"||!s.fields) throw new Error("invalid preset");
  FIELDS.forEach(id=>{ if(!(id in s.fields)) return; const e=$(id), v=s.fields[id];
    if(e.type==="checkbox") e.checked=!!v;
    else if(e.tagName==="SELECT"){ if([...e.options].some(o=>o.value===String(v))) e.value=String(v); }
    else e.value=String(v).slice(0,2000); });
  if(s.col && isHex(s.col.bg) && isHex(s.col.ink) && isHex(s.col.acc)){ state.col={bg:s.col.bg,ink:s.col.ink,acc:s.col.acc}; syncColorInputs(); markTheme(Number.isInteger(s.theme)?s.theme:-1); }
  if(Array.isArray(s.decos)) state.decos=s.decos.filter(k=>typeof k==="string" && (ASSETS[k] || state.userImgs.some(u=>u.key===k)));
  state.fx = s.fx && typeof s.fx==="object" ? s.fx : {}; document.querySelectorAll("#fxList input").forEach(c=>c.checked=!!state.fx[c.dataset.fx]);
  state.hidden = s.hidden && typeof s.hidden==="object" ? s.hidden : {};
  state.offsets = s.offsets && typeof s.offsets==="object" ? s.offsets : {};
  setTpl(s.tpl||"talk");
  $("customSize").hidden=$("format").value!=="custom"; $("durV").textContent=$("dur").value; $("lgCustom").hidden=$("lgColSrc").value!=="custom";
  drawDecoGrid();
}
let saveT=0;
function save(){ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ localStorage.setItem(LS,JSON.stringify(snapshot())); }catch(e){} pushHistory(); },300); }

/* ================= Undo / redo ================= */
const hist=[]; let hpos=-1, restoring=false;
function pushHistory(){
  if(restoring) return; const snap=JSON.stringify(snapshot(true));
  if(hist[hpos]===snap) return;
  hist.splice(hpos+1); hist.push(snap); if(hist.length>150) hist.shift(); hpos=hist.length-1; updUndo();
}
function goHistory(i){
  if(i<0||i>=hist.length) return; hpos=i; restoring=true;
  try{ restore(JSON.parse(hist[i])); }catch(e){}
  setPlaying(false); render(); try{ localStorage.setItem(LS,JSON.stringify(snapshot())); }catch(e){}
  restoring=false; updUndo();
}
function undo(){ clearTimeout(saveT); pushHistory(); goHistory(hpos-1); }
function redo(){ goHistory(hpos+1); }
function updUndo(){ $("undo").disabled=hpos<=0; $("redo").disabled=hpos>=hist.length-1; }

/* ================= Reset everything ================= */
function resetAll(){
  clearTimeout(saveT); pushHistory();
  setPlaying(false);
  FIELDS.forEach(id=>setField(id,DEFAULTS[id]));
  $("decoCat").selectedIndex=0;
  state.col={...THEMES[0]}; state.theme=0; syncColorInputs(); markTheme(0);
  state.decos=DEFAULT_DECOS.filter(k=>ASSETS[k]); state.userImgs=[]; state.fx={}; state.hidden={}; state.offsets={};
  document.querySelectorAll("#fxList input").forEach(c=>c.checked=false);
  sel=null; hover=null;
  document.querySelectorAll("aside details").forEach(d=>d.open=d.hasAttribute("data-default-open"));
  try{ localStorage.removeItem(LS); localStorage.removeItem(LS_UI); }catch(e){}
  setTpl("talk"); setTab("content"); updLogoHint(); updPlay2(); $("customSize").hidden=true; $("durV").textContent=$("dur").value; $("lgCustom").hidden=true;
  drawDecoGrid(); render(); save();
  toast("Everything is back to default.","Undo",undo);
}

/* ================= Small UI helpers ================= */
let toastT=0;
function toast(msg,actionLabel,action){
  const t=$("toast"); t.innerHTML=""; const sp=document.createElement("span"); sp.textContent=msg; t.appendChild(sp);
  if(actionLabel){ const b=document.createElement("button"); b.type="button"; b.textContent=actionLabel; b.onclick=()=>{ t.hidden=true; action(); }; t.appendChild(b); }
  t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true, actionLabel?8000:3500);
}
function reveal(id){
  const e=$(id); if(!e) return; const pn=e.closest(".tabpanel"); if(pn) setTab(pn.id.slice(4));
  const d=e.closest("details"); if(d){ d.hidden=false; d.open=true; }
  e.scrollIntoView({behavior:"smooth",block:"center"});
  e.classList.remove("flash"); void e.offsetWidth; e.classList.add("flash");
  if(e.focus) setTimeout(()=>e.focus({preventScroll:true}),250);
}
/* which control edits which element */
const FIELD_FOR={title:"title",subtitle:"subtitle",kicker:"kicker",body:"body",labels:"tag",footer:"footer",band:"kicker",quote:"title",
  bracket:"body",decos:"decos",avatar:"decos",pattern:"pattern",rulers:"elList",arrow:"arrowDir"};
function editEl(k){ if(k==="logo") reveal(state.tpl==="logo"||$("logo").value==="custom"?"lgLeft":"logo"); else reveal(FIELD_FOR[k]||"elList"); }
function addUserImage(f){
  if(!f || !/^image\//.test(f.type)){ toast("Only image files can be added."); return; }
  if(f.size>15*1048576){ toast("This image is too big (max. 15 MB)."); return; }
  const r=new FileReader();
  r.onload=()=>{ const im=new Image();
    im.onload=()=>{ const key="user:"+Date.now()+Math.floor(Math.random()*1e4); state.userImgs.push({key,img:im,src:r.result});
      state.decos.unshift(key); if(+$("dcount").value===0) $("dcount").value=1; delete state.hidden.decos; delete state.hidden.avatar;
      $("decoCat").value="user"; drawDecoGrid(); drawElList(); render(); save(); toast("Image added to your decorations."); };
    im.onerror=()=>toast("This file could not be read as an image.");
    im.src=r.result; };
  r.readAsDataURL(f);
}
function initShortcuts(){
  const hd=document.querySelector("header"); if(hd){ const fh=()=>document.documentElement.style.setProperty("--hdr",hd.offsetHeight+"px"); fh(); if(window.ResizeObserver) new ResizeObserver(fh).observe(hd); }
  const typing=t=>t && (t.tagName==="TEXTAREA" || (t.tagName==="INPUT" && !["checkbox","range","color","file"].includes(t.type)));
  document.addEventListener("keydown",e=>{
    const mod=e.ctrlKey||e.metaKey; if(!mod) return; const k=e.key.toLowerCase();
    if(k==="s"){ e.preventDefault(); download("png"); return; }
    if(typing(e.target)) return;                // native undo inside text fields
    if(k==="z"&&!e.shiftKey){ e.preventDefault(); undo(); }
    else if((k==="z"&&e.shiftKey)||k==="y"){ e.preventDefault(); redo(); }
  });
  // drop or paste an image anywhere
  const stage=document.querySelector(".stage");
  ["dragenter","dragover"].forEach(ev=>document.addEventListener(ev,e=>{ if([...(e.dataTransfer?.types||[])].includes("Files")){ e.preventDefault(); stage.classList.add("drop"); } }));
  ["dragleave","drop"].forEach(ev=>document.addEventListener(ev,e=>{ if(ev==="dragleave" && e.relatedTarget) return; stage.classList.remove("drop"); }));
  document.addEventListener("drop",e=>{ const f=e.dataTransfer?.files?.[0]; if(f){ e.preventDefault(); addUserImage(f); } });
  document.addEventListener("paste",e=>{ const it=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith("image/")); if(it){ e.preventDefault(); addUserImage(it.getAsFile()); } });
  // remember which sections are open
  let ui={}; try{ ui=JSON.parse(localStorage.getItem(LS_UI)||"{}"); }catch(e){}
  document.querySelectorAll("aside details").forEach((d,i)=>{
    if(!d.id) d.id="more"+i;
    if(d.open) d.setAttribute("data-default-open","");
    if(d.id in ui) d.open=ui[d.id];
    d.addEventListener("toggle",()=>{ try{ const u=JSON.parse(localStorage.getItem(LS_UI)||"{}"); u[d.id]=d.open; localStorage.setItem(LS_UI,JSON.stringify(u)); }catch(e){} });
  });
}
const LS_UI="40c3-generator-ui";
function setTab(name){
  document.querySelectorAll(".tabs [role=tab]").forEach(b=>{ const on=b.dataset.tab===name; b.setAttribute("aria-selected",on); b.tabIndex=on?0:-1; });
  document.querySelectorAll(".tabpanel").forEach(p=>p.hidden=p.id!=="tab-"+name);
  try{ const ui=JSON.parse(localStorage.getItem(LS_UI)||"{}"); ui.tab=name; localStorage.setItem(LS_UI,JSON.stringify(ui)); }catch(e){}
}
function initTabs(){
  const bs=[...document.querySelectorAll(".tabs [role=tab]")];
  bs.forEach((b,i)=>{ b.onclick=()=>{ setTab(b.dataset.tab); document.querySelector("aside").scrollTop=0; };
    b.onkeydown=e=>{ const d=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0; if(d){ const n=bs[(i+d+bs.length)%bs.length]; setTab(n.dataset.tab); n.focus(); } }; });
  let ui={}; try{ ui=JSON.parse(localStorage.getItem(LS_UI)||"{}"); }catch(e){}
  setTab(ui.tab||"content");
}
function updLogoHint(){ $("lgCustomHint").hidden=$("logo").value!=="custom"; }

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
let PK=1, FULL={W:1,H:1};            // preview scale (big formats are previewed smaller) and full size
const unitsPerCssPx=()=>FULL.W/Math.max(1,$("cv").clientWidth);
function hit(p){
  let best=null, area=Infinity; const pad=6*unitsPerCssPx();
  for(const [k,b] of Object.entries(lastBoxes)){
    if(p.x>=b.x-pad&&p.x<=b.x2+pad&&p.y>=b.y-pad&&p.y<=b.y2+pad){ const a=(b.x2-b.x)*(b.y2-b.y); if(a<area){area=a;best=k;} } }
  return best;
}
function overlay(){
  const cv=$("cv"); if(!lastFrame) return; const x=cv.getContext("2d");
  x.clearRect(0,0,cv.width,cv.height); x.drawImage(lastFrame,0,0);
  const s=unitsPerCssPx();
  x.save(); x.scale(PK,PK);
  for(const k of [hover,sel]){ if(!k||!lastBoxes[k]) continue; const b=lastBoxes[k];
    x.save(); x.lineWidth=2*s; x.setLineDash([6*s,4*s]); x.strokeStyle=k===sel?"#ffbc40":"#15ada3";
    x.strokeRect(b.x-4*s,b.y-4*s,b.x2-b.x+8*s,b.y2-b.y+8*s);
    x.setLineDash([]); x.font=`700 ${12*s}px Hack, monospace`; const label=EL_NAMES[k]||k, tw=x.measureText(label).width;
    const ly=Math.max(0,b.y-4*s-18*s); x.fillStyle=x.strokeStyle; x.fillRect(b.x-4*s,ly,tw+10*s,18*s); x.fillStyle="#001300"; x.fillText(label,b.x+1*s,ly+13*s); x.restore(); }
  x.restore();
  // selection toolbar under the preview
  const bar=$("selbar"); bar.hidden=!sel;
  if(sel){ $("selName").textContent=EL_NAMES[sel]||sel; const o=off(sel); $("selReset").disabled=!(o.x||o.y); }
}
function selectEl(k){ sel=k; overlay(); }
function initDrag(){
  const cv=$("cv");
  const pt=e=>{ const r=cv.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*FULL.W, y:(e.clientY-r.top)/r.height*FULL.H}; };
  cv.addEventListener("pointermove",e=>{
    const p=pt(e);
    if(drag){
      const o=state.offsets[state.tpl]||(state.offsets[state.tpl]={});
      o[drag.key]={x:drag.ox+(p.x-drag.px)/FULL.W, y:drag.oy+(p.y-drag.py)/FULL.H}; drag.moved=true;
      if(!dragRAF) dragRAF=requestAnimationFrame(()=>{ dragRAF=0; render(); });
    } else { const h=hit(p); if(h!==hover){ hover=h; cv.style.cursor=h?"move":"default"; cv.title=h?`${EL_NAMES[h]}: drag to move, double-click to edit`:""; overlay(); } }
  });
  cv.addEventListener("pointerdown",e=>{
    const p=pt(e), k=hit(p); selectEl(k); if(!k) return;
    const o=off(k); drag={key:k,px:p.x,py:p.y,ox:o.x,oy:o.y}; cv.setPointerCapture(e.pointerId); e.preventDefault(); cv.focus({preventScroll:true});
  });
  const end=()=>{ if(drag){ const m=drag.moved; drag=null; if(m) save(); overlay(); } };
  cv.addEventListener("pointerup",end); cv.addEventListener("pointercancel",end);
  cv.addEventListener("pointerleave",()=>{ if(!drag && hover){ hover=null; overlay(); } });
  cv.addEventListener("dblclick",e=>{ const k=hit(pt(e)); if(k) editEl(k); });
  cv.addEventListener("keydown",e=>{
    if(!sel) return;
    if(e.key==="Escape"){ selectEl(null); return; }
    if(e.key==="Enter"){ editEl(sel); return; }
    if(e.key==="Delete"||e.key==="Backspace"){ e.preventDefault(); hideSel(); return; }
    const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    if(!d) return; e.preventDefault(); const st=e.shiftKey?0.02:0.004; const o=state.offsets[state.tpl]||(state.offsets[state.tpl]={});
    const c=o[sel]||{x:0,y:0}; o[sel]={x:c.x+d[0]*st,y:c.y+d[1]*st}; render(); save();
  });
  $("selEdit").onclick=()=>sel&&editEl(sel);
  $("selReset").onclick=()=>{ if(sel&&state.offsets[state.tpl]){ delete state.offsets[state.tpl][sel]; render(); save(); } };
  $("selHide").onclick=hideSel;
  $("selClose").onclick=()=>selectEl(null);
}
function hideSel(){ if(!sel) return; const k=sel; state.hidden[k]=true; sel=null; drawElList(); render(); save(); toast(`${EL_NAMES[k]} hidden.`,"Undo",undo); }

/* ================= Drawing helpers ================= */
const FJ = '"Jersey 10"', FH = '"Hack"';
function font(ctx,size,fam,bold,ls){ ctx.font=`${bold?"700 ":""}${size}px ${fam}`; try{ ctx.letterSpacing = ls? (size*ls).toFixed(2)+"px" : "0px"; }catch(e){} }
let BROKE=false;   // set by wrap() when a word had to be split across lines
function wrap(ctx,text,maxW){
  const out=[]; BROKE=false;
  for (const para of String(text).split("\n")){
    const words=para.split(/ +/); let line="";
    for (let w of words){
      while (ctx.measureText(w).width>maxW && w.length>1){ BROKE=true;
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
    if (lines.length*s*lh<=maxH && !BROKE){ best={size:s,lines}; lo=s; } else hi=s;   // never split a word if a smaller size avoids it
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
function decoItem(ctx,name,x,y,size,col,i){ return $("dframe").value==="all" ? decoBox(ctx,name,x,y,size,col,col.ink,i) : drawDeco(ctx,name,x,y,size,size,col,i); }
async function decoBox(ctx,name,x,y,size,col,outline,i=0){
  const fm=$("dframe").value; if(fm==="none") outline=null; else if(fm==="all" && !outline) outline=col.ink;
  const lw=Math.max(2,size*0.03); addBox(x,y,size,size);
  if(outline) strokeRect(ctx,x,y,size,size,lw,outline);
  if(name){ const pad = /Boxes\//.test(name) ? (outline?size*0.08:0) : name.startsWith("user:") ? lw*2 : size*0.16;
    ctx.save(); if(!(/Boxes\//.test(name) && !outline)){ ctx.beginPath(); ctx.rect(x+lw,y+lw,size-2*lw,size-2*lw); ctx.clip(); }
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
    const lit = -1;   // rulers stay still, even when animated
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
    if(n) await el(ctx,"decos",async()=>{ for(let i=0;i<n;i++) await decoItem(ctx,state.decos[i],x0+i*ds*1.5,m+lh-ds,ds,col,i); });
  } else if(!ultra){
    const ds=s*0.065*t.dscale, decos=decosList(t,Math.floor((W-2*m)/(ds*1.6)));
    if(decos.length){ const b0=bottom; await el(ctx,"decos",async()=>{ for(let i=0;i<decos.length;i++) await decoItem(ctx,decos[i],W-m-(i+1)*ds*1.5+ds*0.5,b0-ds,ds,col,i); }); bottom-=ds+m*0.5; }
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

/* Motto poster: one big community statement, citizens below */
async function tplMotto(ctx,W,H,col,t){
  const s=Math.min(W,H), m=s*0.08, land=W/H>1.25;
  const lh=s*0.1; const L=logoSize(lh);
  if(L.w) await el(ctx,"logo",()=>drawLogo(ctx,m,m,lh,col,"left"));
  if(t.kicker){ const fs=s*0.032; await el(ctx,"kicker",()=>footerText(ctx,t.kicker.toUpperCase(),W-m,m+fs*0.9,fs,col.acc,"right")); }
  let bottom=H-m;
  if(t.footer){ const fs=s*0.028, b0=bottom; await el(ctx,"footer",()=>footerText(ctx,t.footer,W/2,b0,fs,col.acc,"center")); bottom-=fs*2.2; }
  const decos=decosList(t,land?7:5);
  if(decos.length){
    const ds=Math.min(s*0.2*t.dscale,(W-2*m)/(decos.length*1.15)), gap=decos.length>1?(W-2*m-decos.length*ds)/(decos.length-1):0;
    const b0=bottom, x0=decos.length===1?W/2-ds/2:m;
    await el(ctx,"decos",async()=>{ for(let i=0;i<decos.length;i++) await decoItem(ctx,decos[i],x0+i*(ds+gap),b0-ds,ds,col,i); });
    bottom-=ds+m*0.6;
  }
  const top=m+Math.max(L.h,s*0.05)+m*0.5;
  let sf=null; if(t.subtitle) sf=fit(ctx,t.subtitle,FH,true,W-2*m,s*0.12,1.3,s*0.05*t.bscale,s*0.016);
  let bf=null; if(t.body) bf=fit(ctx,t.body,FH,false,Math.min(W-2*m,s*1.1),s*0.14,1.35,s*0.032*t.bscale,s*0.013);
  const tagH=(t.tag||t.tag2)? s*0.045*1.35+s*0.03 : 0;
  const rest=(sf?sf.height+s*0.035:0)+(bf?bf.height+s*0.03:0)+tagH;
  const mt={...t, title: $("caps").checked||$("tfont").value==="jersey" ? t.title.toUpperCase() : t.title};
  const f=fitTitle(ctx,mt,W-2*m,bottom-top-rest-s*0.04,s*0.34,s*0.03);
  let y=top+(bottom-top-rest-(t.title?f.height:0))/2;
  if(t.title){ const yy=y; await el(ctx,"title",()=>drawLines(ctx,f,W/2,yy-f.size*0.06,col.ink,"center",titleOpts(f))); y+=f.height+s*0.035; }
  if(sf){ const yy=y; await el(ctx,"subtitle",()=>drawLines(ctx,sf,W/2,yy,col.acc,"center",{underline:t.underline})); y+=sf.height+s*0.03; }
  if(tagH){ const yy=y, ts=s*0.045; await el(ctx,"labels",()=>{ font(ctx,ts,FJ); const w=(t.tag?ctx.measureText(t.tag).width+ts*1.4:0)+(t.tag2?ctx.measureText(t.tag2).width+ts*0.9:0); tagsRow(ctx,t,W/2-w/2,yy,ts,col,W-2*m,false); }); y+=tagH; }
  if(bf){ const yy=y; await el(ctx,"body",()=>drawLines(ctx,bf,W/2,yy,col.ink,"center")); }
}

/* Wayfinding sign: big arrow + destination */
const ARROW_ANGLE={right:0,dr:45,down:90,dl:135,left:180,ul:225,up:270,ur:315};
function arrowPath(g){ // arrow pointing right inside the unit square (-0.5..0.5)
  g.beginPath(); g.moveTo(-0.46,-0.13); g.lineTo(0.02,-0.13); g.lineTo(0.02,-0.36); g.lineTo(0.46,0); g.lineTo(0.02,0.36); g.lineTo(0.02,0.13); g.lineTo(-0.46,0.13); g.closePath();
}
const pixArrowCache=new Map();
function pixelCells(angle){
  if(pixArrowCache.has(angle)) return pixArrowCache.get(angle);
  const N=13, c=document.createElement("canvas"); c.width=c.height=N; const g=c.getContext("2d",{willReadFrequently:true});
  g.translate(N/2,N/2); g.rotate(angle*Math.PI/180); g.scale(N*1.02,N*1.02); g.fillStyle="#000"; arrowPath(g); g.fill();
  const d=g.getImageData(0,0,N,N).data, cells=[];
  for(let y=0;y<N;y++) for(let x=0;x<N;x++) if(d[(y*N+x)*4+3]>110) cells.push([x,y]);
  const r={N,cells}; pixArrowCache.set(angle,r); return r;
}
function drawArrow(ctx,cx,cy,size,angle,style,color,bg){
  const lw=Math.max(3,size*0.035);
  if(style==="pixel"){
    const {N,cells}=pixelCells(angle), cs=size/N;
    ctx.fillStyle=color; cells.forEach(([x,y])=>ctx.fillRect(cx-size/2+x*cs+cs*0.06,cy-size/2+y*cs+cs*0.06,cs*0.88,cs*0.88));
  } else {
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle*Math.PI/180); ctx.scale(size,size); arrowPath(ctx);
    if(style==="outline"){ ctx.lineWidth=lw/size; ctx.lineJoin="miter"; ctx.strokeStyle=color; ctx.stroke(); }
    else { ctx.fillStyle=color; ctx.fill(); }
    ctx.restore();
  }
  if(style==="box"){} // reserved
  addBox(cx-size/2,cy-size/2,size,size);
}
async function tplWay(ctx,W,H,col,t){
  const s=Math.min(W,H), m=s*0.075, land=W/H>1.15;
  const dir=$("arrowDir").value, ang=ARROW_ANGLE[dir]??0, style=$("arrowStyle").value;
  // bottom band with footer + logo
  let bottom=H;
  const bh=s*0.1;
  if(t.footer || logoKind()!=="none"){
    bottom=H-bh;
    if(t.footer) await el(ctx,"footer",()=>{ ctx.fillStyle=col.ink; ctx.fillRect(0,H-bh,W,bh); addBox(0,H-bh,W,bh); footerText(ctx,t.footer,m,H-bh/2+bh*0.4*0.36,bh*0.4,col.bg,"left"); });
    if(logoKind()!=="none") await el(ctx,"logo",()=>drawLogo(ctx,W-m,H-bh*0.85,bh*0.7,t.footer?{bg:col.ink,ink:col.bg,acc:col.bg}:col,"right"));
  }
  const area={x:m,y:m,w:W-2*m,h:bottom-2*m};
  const arrowRight = [0,45,315].includes(ang);
  let ax,ay,asz, tx,tw,ty,th;
  if(land){
    asz=Math.min(area.h,area.w*0.42);
    ax = arrowRight ? area.x+area.w-asz/2 : area.x+asz/2; ay=area.y+area.h/2;
    tx = arrowRight ? area.x : area.x+asz+s*0.06; tw=area.w-asz-s*0.06; ty=area.y; th=area.h;
  } else {
    asz=Math.min(area.w*0.8,area.h*0.45); ax=W/2; ay=area.y+asz/2;
    tx=area.x; tw=area.w; ty=area.y+asz+s*0.05; th=area.h-asz-s*0.05;
  }
  if(shown("arrow")){
    const push = FX.float ? Math.sin(FX.t*Math.PI*2)*asz*0.06 : 0, rad=ang*Math.PI/180;
    const on = !(FX.blink && Math.floor(FX.t*4)%2===1);
    await el(ctx,"arrow",()=>{ if(style==="box"){ strokeRect(ctx,ax-asz/2,ay-asz/2,asz,asz,Math.max(3,asz*0.03),col.acc); }
      if(on) drawArrow(ctx,ax+Math.cos(rad)*push,ay+Math.sin(rad)*push,style==="box"?asz*0.78:asz,ang,style==="box"?"solid":style,col.acc,col.bg); addBox(ax-asz/2,ay-asz/2,asz,asz); });
  }
  const al = land&&!arrowRight ? "left" : land ? "left" : "center", X = al==="center" ? tx+tw/2 : tx;
  let sf=null; if(t.subtitle) sf=fit(ctx,t.subtitle,FH,true,tw,th*0.25,1.25,s*0.06*t.bscale,s*0.018);
  let bf=null; if(t.body) bf=fit(ctx,t.body,FH,false,tw,th*0.2,1.35,s*0.034*t.bscale,s*0.013);
  const kick=t.kicker? s*0.055:0, tagH=(t.tag||t.tag2)? s*0.045*1.35+s*0.03 : 0;
  const rest=kick+(sf?sf.height+s*0.035:0)+(bf?bf.height+s*0.03:0)+tagH;
  const wt={...t, title: $("tfont").value==="jersey" ? t.title.toUpperCase() : t.title};
  const f=fitTitle(ctx,wt,tw,th-rest-s*0.03,s*0.3,s*0.03);
  let y=ty+(th-rest-(t.title?f.height:0))/2;
  y+=drawKicker(ctx,t,X,y,s,col,al);
  if(t.title){ const yy=y; await el(ctx,"title",()=>drawLines(ctx,f,X,yy-f.size*0.06,col.ink,al,titleOpts(f))); y+=f.height+s*0.035; }
  if(sf){ const yy=y; await el(ctx,"subtitle",()=>drawLines(ctx,sf,X,yy,col.acc,al,{underline:t.underline})); y+=sf.height+s*0.03; }
  if(tagH){ const yy=y, ts=s*0.045; await el(ctx,"labels",()=>{ if(al==="center"){ font(ctx,ts,FJ); const w=(t.tag?ctx.measureText(t.tag).width+ts*1.4:0)+(t.tag2?ctx.measureText(t.tag2).width+ts*0.9:0); tagsRow(ctx,t,X-w/2,yy,ts,col,tw,false);} else tagsRow(ctx,t,X,yy,ts,col,tw,false); }); y+=tagH; }
  if(bf){ const yy=y; await el(ctx,"body",()=>drawLines(ctx,bf,X,yy,col.ink,al)); }
}

/* ================= Quick-start presets ================= */
const CITIZENS=["Citizens/Adam.svg","Citizens/Barbara.svg","Citizens/Mona.svg","Citizens/bip.svg","Citizens/Luckycat.svg","Citizens/Blahaj.svg"];
const PRESETS={
  creatures:{tpl:"motto",theme:0,format:"2480x3508",title:"All creatures are welcome",subtitle:"",body:"",kicker:"40C3 · Model Citizens",tag:"",tag2:"",footer:"Be kind · Be curious · Be yourself",decos:CITIZENS,dcount:6},
  excellent:{tpl:"motto",theme:1,format:"2480x3508",title:"Be excellent to each other",subtitle:"",body:"Respect people's boundaries. Ask before taking photos. If something is wrong, talk to an angel or the awareness team.",kicker:"40C3 · Model Citizens",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",decos:["Icons_Deco/Icon_Blinkenheart.svg","Icons_Deco/Icon_Smiley.svg","Icons_Deco/Star.svg"],dcount:3},
  thisway:{tpl:"way",theme:0,format:"3508x2480",title:"This way",subtitle:"Saal 1 · Hack Center",body:"",kicker:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",arrow:"right"},
  toilets:{tpl:"way",theme:5,format:"3508x2480",title:"Toilets",subtitle:"All genders welcome",body:"",kicker:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",arrow:"left"},
  photos:{tpl:"motto",theme:7,format:"2480x3508",title:"No photos without consent",subtitle:"Ask first. Always.",body:"",kicker:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",decos:["Icons_Deco/Icon_TV.svg","Citizens/bip.svg"],dcount:2},
  talk:{tpl:"talk",theme:0,format:"1920x1080",title:"This is an Awesome Talk: See You Late December",subtitle:"Citizen A and Citizen B",body:"A model citizen is supposedly exemplary, but in hacker culture that means questioning rules rather than following them.",kicker:"",tag:"A LOUD HEADER!",tag2:"a quiet header",footer:"40C3 · MODEL_CITIZENS",decos:DEFAULT_DECOS,dcount:6},
  // ---- more posters
  sleep:{tpl:"motto",theme:3,format:"2480x3508",kicker:"Congress survival rule",title:"6 · 2 · 1",subtitle:"6 hours of sleep, 2 meals, 1 shower. Every day.",body:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",decos:["Icons_Deco/Icon_Boot.svg","Boxes/Box_Mate.svg","Icons_Deco/Icon_Smiley.svg"],dcount:3},
  mate:{tpl:"motto",theme:4,format:"2480x3508",kicker:"",title:"Drink Mate. Drink water.",subtitle:"Stay hydrated, citizen.",body:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",decos:["Boxes/Box_Mate.svg","Icons_Deco/Star.svg"],dcount:2},
  quiet:{tpl:"motto",theme:8,format:"2480x3508",kicker:"Please",title:"Quiet zone",subtitle:"People are sleeping, thinking or hacking here.",body:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",decos:["Icons_Deco/Icon_Blob2.svg","Citizens/Luckycat.svg"],dcount:2},
  angel:{tpl:"poster",theme:2,format:"2480x3508",kicker:"Help make it happen",title:"Become an angel",subtitle:"Volunteer for a few shifts",body:"Angels keep the congress running: info desk, entry, cloakroom, logistics. Sign up for a shift you like.",tag:"VOLUNTEER",tag2:"no experience needed",footer:"40C3 · MODEL_CITIZENS",decos:["Icons_Deco/Icon_Blinkenheart.svg","Boxes/Box_Friends.svg","Icons_Deco/Star.svg"],dcount:3,set:{pattern:"Patterns/Pattern1.svg"}},
  lost:{tpl:"motto",theme:7,format:"2480x3508",kicker:"",title:"Lost & found",subtitle:"Found something? Bring it to the info desk.",body:"Lost something? Ask there too.",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",decos:["Icons_Deco/Icon_KeyShort.svg","Icons_Deco/Icon_USB.svg"],dcount:2},
  hackplanet:{tpl:"motto",theme:1,format:"2480x3508",kicker:"",title:"Hack the planet",subtitle:"",body:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",decos:CITIZENS,dcount:6,set:{caps:true}},
  // ---- more signs
  info:{tpl:"way",theme:0,format:"3508x2480",kicker:"",title:"Info desk",subtitle:"Questions · Help",body:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",arrow:"up"},
  lounge:{tpl:"way",theme:6,format:"3508x2480",kicker:"",title:"Lounge",subtitle:"Chill out · Music · Couches",body:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",arrow:"ur"},
  exit:{tpl:"way",theme:10,format:"3508x2480",kicker:"",title:"Exit",subtitle:"",body:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",arrow:"left",set:{arrowStyle:"box"}},
  // ---- social media & more
  seeyou:{tpl:"motto",theme:0,format:"1080x1080",kicker:"Save the date",title:"See you at 40C3",subtitle:"",body:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",decos:["Icons_Deco/Icon_Smiley.svg","Icons_Deco/Star.svg"],dcount:2},
  going:{tpl:"motto",theme:1,format:"1080x1920",kicker:"",title:"I'm going to 40C3",subtitle:"Find me there!",body:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",decos:CITIZENS,dcount:4},
  quote:{tpl:"quote",theme:2,format:"1080x1350",kicker:"",title:"Information wants to be free.",subtitle:"Stewart Brand",body:"",tag:"",tag2:"",footer:"40C3 · MODEL_CITIZENS",decos:["Citizens/Adam.svg"],dcount:1},
  workshop:{tpl:"talk",theme:7,format:"1920x1080",kicker:"Workshop",title:"Soldering for absolute beginners",subtitle:"Hardware Hacking Area · Day 2, 14:00",body:"Make your first blinking badge. All tools and parts are provided, just bring your curiosity.",tag:"FREE",tag2:"all ages",footer:"40C3 · MODEL_CITIZENS",decos:["Boxes/Box_Blinken.svg","Icons_Deco/Icon_Blinkenheart.svg","Boxes/Box_Cables.svg","Icons_Deco/Star.svg"],dcount:4},
  badge:{tpl:"badge",theme:2,format:"1063x1535",kicker:"Hello, my name is",title:"Your Name",subtitle:"they/them",body:"",tag:"Ask me about",tag2:"retro computers",footer:"40C3 · MODEL_CITIZENS",decos:["Citizens/Blahaj.svg"],dcount:1},
  teamlogo:{tpl:"logo",theme:0,format:"fit",kicker:"",title:"",subtitle:"",body:"",tag:"",tag2:"",footer:"",set:{lgLeft:"HQ",lgRight:"42",lgCap:"HACK\nQUARTER",lgEye:"star"}},
};
/* Ready-made gallery: mini cards in each template's own colors and shape */
const READY = {
  "Posters":[["creatures","All creatures are welcome"],["excellent","Be excellent to each other"],["photos","No photos without consent"],["sleep","6 · 2 · 1"],["mate","Drink Mate"],["quiet","Quiet zone"],["angel","Become an angel"],["lost","Lost & found"],["hackplanet","Hack the planet"]],
  "Signs":[["thisway","This way →"],["toilets","← Toilets"],["info","↑ Info desk"],["lounge","↗ Lounge"],["exit","← Exit"]],
  "Social":[["seeyou","See you at 40C3"],["going","I'm going to 40C3"],["quote","Quote card"]],
  "Talks & badges":[["talk","Talk card"],["workshop","Workshop"],["badge","Name badge"],["teamlogo","Team logo"]],
};
let readyCat="Posters";
function openReady(){ $("readyPanel").hidden=false; $("readyBtn").setAttribute("aria-expanded","true"); const f=$("readyList").querySelector("button"); if(f) f.focus(); }
function closeReady(){ $("readyPanel").hidden=true; $("readyBtn").setAttribute("aria-expanded","false"); }
function initReady(){
  buildReady();
  $("readyBtn").onclick=e=>{ e.stopPropagation(); $("readyPanel").hidden ? openReady() : closeReady(); };
  document.addEventListener("click",e=>{ if(!$("readyPanel").hidden && !e.target.closest(".hdr-ready")) closeReady(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("readyPanel").hidden){ closeReady(); $("readyBtn").focus(); } });
}
function buildReady(){
  const cats=$("readyCats"); cats.innerHTML="";
  Object.keys(READY).forEach(c=>{ const b=document.createElement("button"); b.type="button"; b.textContent=c; b.setAttribute("aria-pressed",c===readyCat);
    b.onclick=e=>{ e.stopPropagation(); readyCat=c; buildReady(); }; cats.appendChild(b); });
  const list=$("readyList"); list.innerHTML="";
  READY[readyCat].forEach(([k,label])=>{ const p=PRESETS[k]; if(!p) return; const th=THEMES[p.theme]||THEMES[0];
    const [w,h]=(p.format||"1080x1080").split("x").map(Number); const r=w&&h? w/h : 1;
    const b=document.createElement("button"); b.type="button"; b.className="pcard"; b.title="Load the “"+label+"” template";
    const card=document.createElement("span"); card.className="pthumb"; card.style.background=th.bg; card.style.color=th.ink; card.style.borderColor=th.acc;
    card.textContent = p.tpl==="logo" ? (p.set&&p.set.lgLeft||"40")+(p.set&&p.set.lgRight||"C3") : (p.title||label);
    const fmt = p.format==="fit" ? "Logo" : p.format==="1080x1920" ? "Story" : p.format==="1063x1535" ? "Badge" : /^(2480|3508)/.test(p.format) ? "A4" : r>1.25 ? "Landscape" : r<0.85 ? "Portrait" : "Square";
    const cap=document.createElement("span"); cap.className="pcap"; cap.textContent = fmt==="A4" ? (p.tpl==="way"?"A4 sign":"A4 poster") : fmt;
    b.append(card,cap); b.onclick=()=>{ closeReady(); applyPreset(k); setTab("content"); toast("“"+label+"” loaded. Now change the text below.","Undo",undo); reveal("title"); }; list.appendChild(b); });
}
function applyPreset(k){
  const p=PRESETS[k]; if(!p) return;
  ["title","subtitle","body","kicker","tag","tag2","footer","format"].forEach(id=>{ if(p[id]!=null) $(id).value=p[id]; });
  if(p.arrow) $("arrowDir").value=p.arrow;
  if(p.dcount!=null) $("dcount").value=p.dcount;
  if(p.decos) state.decos=p.decos.filter(d=>ASSETS[d]);
  else state.decos=DEFAULT_DECOS.filter(d=>ASSETS[d]);
  // a ready-made always starts clean: default style, no animation, nothing moved or hidden
  ["tfont","align","logo","caps","underline","tsize","tspace","bsize","texture","frame","pattern","popac","pscale","dsize","dtint","dframe","lsize","logoCol",
   "lgLeft","lgRight","lgCap","lgEye","lgRays","lgStyle","lgFont","lgLayout","arrowStyle"].forEach(id=>setField(id,DEFAULTS[id]));
  if(p.set) Object.entries(p.set).forEach(([id,v])=>setField(id,v));
  state.fx={}; document.querySelectorAll("#fxList input").forEach(c=>c.checked=false); setPlaying(false); updPlay2();
  state.hidden={}; state.offsets[p.tpl]={};
  $("customSize").hidden=$("format").value!=="custom";
  setTheme(p.theme,true); setTpl(p.tpl); drawDecoGrid(); render(); save();
}

/* ================= Chaos mode ================= */
function chaos(){
  const r=Math.random, cs=Object.values(P);
  let bg=pick(cs), ink=pick(cs.filter(c=>c!==bg && contrast(c,bg)>1.6)), acc=pick(cs.filter(c=>c!==bg));
  if(r()<.15){ bg="#"+Math.floor(r()*0xffffff).toString(16).padStart(6,"0"); ink=contrast(P.A,bg)>contrast(P.B,bg)?P.A:P.B; }
  state.col={bg,ink,acc}; markTheme(-1); syncColorInputs();
  const set=(id,v)=>{ const e=$(id); if(e.type==="checkbox") e.checked=v; else e.value=v; };
  set("tfont",pick(["jersey","jersey","hackb","hack"])); set("align",pick(["left","center"])); set("caps",r()<.5);
  set("tsize",Math.round(70+r()*60)); set("tspace",Math.round(-4+r()*28)); set("bsize",Math.round(70+r()*80));
  set("texture",pick(["grid","dots","lines","zeros",""])); set("frame",pick(["border","double","corners","ruler",""]));
  set("pattern",pick(patterns)); set("popac",Math.round(15+r()*70)); set("pscale",Math.round(50+r()*190));
  set("dtint",pick(["auto","acc","ink"])); set("dcount",Math.round(3+r()*5)); set("dsize",Math.round(60+r()*90));
  set("logo",pick(["icon","text","custom"])); set("logoCol",pick(["ink","acc"])); set("lsize",Math.round(60+r()*110));
  set("lgEye",pick(["eye","pupil","dot","diamond","star","x","heart"])); set("lgRays",pick(["0","1","3","5"]));
  set("lgStyle",pick(["solid","stencil","outline"])); set("lgFont",pick(["jersey","hackb"]));
  set("arrowDir",pick(Object.keys(ARROW_ANGLE))); set("arrowStyle",pick(["solid","outline","pixel","box"]));
  shuffleDecos(allDecos.slice());
  const o=state.offsets[state.tpl]={};
  TPL_ELS[state.tpl].forEach(k=>{ if(r()<.45) o[k]={x:(r()-.5)*0.12,y:(r()-.5)*0.1}; });
  // Chaos stays watchable: no moving background (no palette cycle, no scrolling pattern),
  // at most 2 effects, and never two "screen-wide" effects (glitch + CRT) together.
  const fx=["type","float","glitch","crt","pulse","blink"].sort(()=>r()-.5); state.fx={};
  const n=1+(r()<.5?1:0); for(const k of fx){ if(Object.keys(state.fx).length>=n) break; if((k==="glitch"&&state.fx.crt)||(k==="crt"&&state.fx.glitch)) continue; state.fx[k]=true; }
  document.querySelectorAll("#fxList input").forEach(c=>c.checked=!!state.fx[c.dataset.fx]);
  drawDecoGrid(); save();
  if(playing){ render(); } else setPlaying(true);
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
      const cw=ctx.canvas.width, ch=ctx.canvas.height, q=cw/W;
      const src=document.createElement("canvas"); src.width=cw; src.height=ch; src.getContext("2d").drawImage(ctx.canvas,0,0);
      const n=3+Math.floor(r()*6);
      ctx.save(); ctx.setTransform(1,0,0,1,0,0);
      for(let i=0;i<n;i++){ const y=r()*H*q, h=s*(0.01+r()*0.07)*q, dx=(r()-0.5)*s*0.12*q; ctx.drawImage(src,0,y,cw,h,dx,y,cw,h); }
      ctx.restore();
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
const TPL={talk:tplTalk,banner:tplBanner,poster:tplPoster,quote:tplQuote,badge:tplBadge,motto:tplMotto,way:tplWay,logo:tplLogo};
/* draws one frame; t in [0,1) when animated, null for the still image */
async function drawFrame(ctx,W,H,t){
  FX.on = t!=null && anyFx();
  Object.keys(FX).forEach(k=>{ if(!["on","t","frames"].includes(k)) delete FX[k]; });
  if(FX.on){ FX.t=t; Object.assign(FX,state.fx); } else FX.t=0;
  let col=state.col;
  if(FX.cycle){ // calm cycle: one official palette per second, starting from the current one
    const pal=THEMES.slice(0,8), steps=Math.max(2,Math.round(+$("dur").value||3)), st=Math.max(0,state.theme)%8;
    const k=Math.floor(t*steps)%steps; col = k===0 ? state.col : pal[(st+k)%8]; }
  const tt=T(); BOXES={}; CW=W; CH=H; CUR=null; CUROFF={x:0,y:0}; SUP=0;
  await background(ctx,W,H,col,tt);
  await TPL[state.tpl](ctx,W,H,col,tt);
  frame(ctx,W,H,col);
  postFx(ctx,W,H,col);
}
/* Every drawFrame call goes through this queue: frames share global state (FX, element boxes),
   so two drawings must never interleave (this used to break the preview when effects were toggled). */
let drawQueue=Promise.resolve();
function drawLocked(fn){ const p=drawQueue.then(fn); drawQueue=p.catch(e=>console.error(e)); return p; }
async function drawFrameLocked(ctx,W,H,t){ return drawLocked(()=>drawFrame(ctx,W,H,t)); }
let renderId=0;
async function render(){
  if(playing) return;   // the animation loop already redraws
  const id=++renderId;
  await drawLocked(async()=>{
    if(id!==renderId || playing) return;      // a newer render is queued: skip this one
    const [W,H]=size(); const off=previewCanvas(W,H);
    await drawFrame(off.ctx,W,H,null);
    if(id!==renderId || playing) return;
    show(off.c,W,H);
    $("info").textContent=`${W} × ${H} px`+(state.tpl==="logo"&&transparentBg()?" · transparent":"");
  });
}
const PREVIEW_MAX=2000;   // longest side of the on-screen preview; exports always use the full size
function previewCanvas(W,H){
  const k=Math.min(1,PREVIEW_MAX/Math.max(W,H)), c=document.createElement("canvas");
  c.width=Math.round(W*k); c.height=Math.round(H*k); const ctx=c.getContext("2d"); ctx.scale(k,k); return {c,ctx,k};
}
function show(off,W,H){
  const cv=$("cv"); PK=off.width/W; FULL={W,H};
  if(cv.width!==off.width||cv.height!==off.height){cv.width=off.width; cv.height=off.height;}
  cv.classList.toggle("transp",transparentBg());
  lastFrame=off; lastBoxes=BOXES; if(sel&&!lastBoxes[sel]) sel=null; if(hover&&!lastBoxes[hover]) hover=null;
  overlay();
}
/* preview loop: one loop at a time, identified by its generation number */
let playing=false, loopGen=0, t0=0;
function setPlaying(on){
  if(on && !anyFx()){ needFx(); on=false; }
  if(on===playing) return;
  playing=on; $("play").textContent=playing?"■ Stop":"▶ Preview"; $("play").setAttribute("aria-pressed",playing); updPlay2();
  const gen=++loopGen;
  if(playing){ t0=performance.now(); loop(gen); } else render();
}
function updPlay2(){ const b=$("play2"); b.hidden=!anyFx(); b.textContent=playing?"■ Pause animation":"▶ Play animation"; b.setAttribute("aria-pressed",playing); }
function togglePlay(){ setPlaying(!playing); }
function needFx(){ reveal("fxList"); toast("Pick at least one effect first (4 · Motion)."); }
async function loop(gen){
  while(playing && gen===loopGen){
    const dur=+$("dur").value*1000, t=((performance.now()-t0)%dur)/dur;
    FX.frames=Math.max(2,Math.round(+$("dur").value*+$("fps").value));
    const tq=Math.floor(t*FX.frames)/FX.frames;   // same frames as the export
    try{
      await drawLocked(async()=>{
        if(!playing || gen!==loopGen) return;
        const [W,H]=size(); const off=previewCanvas(W,H);
        await drawFrame(off.ctx,W,H,tq);
        if(playing && gen===loopGen){ show(off.c,W,H); $("info").textContent=`${W} × ${H} px · previewing ${$("dur").value}s loop`; }
      });
    }catch(e){ console.error(e); }
    await new Promise(r=>requestAnimationFrame(r));
  }
}

/* ================= Export ================= */
function fname(ext){ const s=(state.tpl==="logo" ? "logo-"+$("lgLeft").value+$("lgRight").value : $("title").value||"visual").toLowerCase().normalize("NFD").replace(/[^\w]+/g,"-").replace(/^-|-$/g,"").slice(0,40); return `40c3-${s||"visual"}.${ext}`; }
function saveBlob(b,name){ const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); }
async function stillCanvas(){ const [W,H]=size(); const c=document.createElement("canvas"); c.width=W; c.height=H; await drawFrameLocked(c.getContext("2d"),W,H,null); return c; }
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
    try{ await navigator.clipboard.write([new ClipboardItem({"image/png":b})]); toast("Image copied: paste it anywhere."); }
    catch(e){ toast(window.isSecureContext ? "Your browser refused the copy. Use Download instead." : "Copy only works once the site is online (https). Use Download instead."); }
  },"image/png");
}
function setBusy(v){ document.querySelectorAll(".actions button").forEach(b=>b.disabled=v); document.body.classList.toggle("busy",v); }
function progress(p,txt){ const b=$("bar"); b.style.display=p==null?"none":"block"; if(p!=null) b.firstChild.style.width=(p*100).toFixed(1)+"%"; if(txt) $("info").textContent=txt; }
const tick=()=>new Promise(r=>setTimeout(r,0));
async function exportGif(){
  if(!anyFx()){ needFx(); return; }
  if(!window.gifenc){ $("info").textContent="GIF encoder not available."; return; }
  const wasPlaying=playing; if(playing) togglePlay();
  const btn={set disabled(v){ setBusy(v); }}; btn.disabled=true;
  try{
    const [W,H]=size(), sc=+$("gscale").value, w=Math.round(W*sc), h=Math.round(H*sc);
    const fps=+$("fps").value, n=Math.max(2,Math.round(+$("dur").value*fps)); FX.frames=n;
    const {GIFEncoder,quantize,applyPalette}=window.gifenc; const gif=GIFEncoder();
    const big=document.createElement("canvas"); big.width=W; big.height=H; const bctx=big.getContext("2d");
    const small=document.createElement("canvas"); small.width=w; small.height=h; const sctx=small.getContext("2d",{willReadFrequently:true});
    for(let i=0;i<n;i++){
      await drawFrameLocked(bctx,W,H,i/n);
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
  if(!anyFx()){ needFx(); return; }
  if(!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream){ $("info").textContent="Video recording is not supported by this browser."; return; }
  const types=["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
  const mime=types.find(t=>MediaRecorder.isTypeSupported(t)); if(!mime){ $("info").textContent="No video format available in this browser."; return; }
  const wasPlaying=playing; if(playing) togglePlay();
  const btn={set disabled(v){ setBusy(v); }}; btn.disabled=true;
  try{
    const [W,H]=size(); const fps=+$("fps").value, loops=2, n=Math.round(+$("dur").value*fps); FX.frames=n;
    // pre-render all frames first so playback timing is exact
    const frames=[]; const tmp=document.createElement("canvas"); tmp.width=W; tmp.height=H; const tctx=tmp.getContext("2d");
    for(let i=0;i<n;i++){ await drawFrameLocked(tctx,W,H,i/n); frames.push(await createImageBitmap(flatten(tmp))); progress((i+1)/n*0.5,`Rendering frame ${i+1}/${n}…`); await tick(); }
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
  initShortcuts(); $("play2").onclick=togglePlay; updLogoHint(); updPlay2();
  glyphCache.clear(); tintCache.clear(); await render(); pushHistory();
})();
