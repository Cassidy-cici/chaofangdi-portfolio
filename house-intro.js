/* Opening-only screen. Subsequent page and reader loaders remain independent. */
(()=>{
 const key='portfolio-house-intro-seen-v1';
 const params=new URLSearchParams(location.search);
 let seen=false;
 try{seen=sessionStorage.getItem(key)==='true';}catch{}
 const forced=params.get('intro')==='1';
 if(!forced&&(seen||params.has('room')))return;
 const html=document.documentElement;
 html.classList.add('house-intro-pending');
 let overlay=null,finished=false,failed=false,value=0,lastAnnounced=-1,closing=null;
 const records=new Map();
 const sizes=window.houseIntroAssetBytes||{};
 const normalize=url=>new URL(url,location.href).pathname;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let status='正在把小屋搬过来…';
 function ensure(){
  if(overlay||!document.body)return;
  overlay=document.createElement('section');overlay.id='house-intro';
  overlay.setAttribute('aria-label','欢迎来到晁芳蒂的小屋，正在加载');
  overlay.innerHTML='<h1 class="house-intro-welcome" aria-hidden="true">WELCOME</h1><div class="house-intro-footer"><div><p class="house-intro-signature">晁芳蒂 — PORTFOLIO ’26</p><p class="house-intro-status" role="status" aria-live="polite"></p><button class="house-intro-retry" type="button" hidden>重新加载</button></div><div class="house-intro-counter" role="progressbar" aria-label="小屋加载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span>0</span><small>%</small></div></div><div class="house-intro-track" aria-hidden="true"><span></span></div>';
  document.body.append(overlay);document.body.classList.add('is-loading');
  overlay.querySelector('button').addEventListener('click',()=>location.reload());
  paint();
 }
 function paint(){
  if(!overlay)return;
  overlay.style.setProperty('--intro-progress',String(value/100));
  overlay.querySelector('.house-intro-counter span').textContent=String(value);
  const step=Math.floor(value/10)*10;
  if(step!==lastAnnounced||finished){overlay.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',String(value));lastAnnounced=step;}
  overlay.querySelector('.house-intro-status').textContent=status;
  overlay.dataset.progress=String(value);
 }
 function set(next){if(finished||failed)return;value=Math.max(value,Math.min(99,Math.floor(next)));paint();}
 function recalculate(){
  let loaded=0,total=0;
  for(const r of records.values()){total+=r.weight;loaded+=r.weight*(r.done?1:Math.min(.99,r.loaded/Math.max(1,r.total)));}
  if(total)set(3+89*loaded/total);
 }
 function plan(paths){
  const keep=new Set(paths.map(normalize));
  for(const path of records.keys())if(!keep.has(path))records.delete(path);
  for(const url of paths){const path=normalize(url);if(!records.has(path)){const size=sizes[url.replace(/^\.\//,'').split('?')[0]]||65536;records.set(path,{weight:size,total:size,loaded:0,done:false});}}
  recalculate();
 }
 function transfer(url,loaded,total){const r=records.get(normalize(url));if(!r)return;r.loaded=Math.max(r.loaded,loaded);if(total>0)r.total=total;recalculate();}
 function complete(url){const r=records.get(normalize(url));if(!r)return;r.done=true;recalculate();}
 function fail(){
  if(finished||failed)return;failed=true;clearTimeout(slow);ensure();
  status='小屋暂时没能加载完成，请再试一次。';paint();
  if(overlay){overlay.dataset.state='error';overlay.querySelector('button').hidden=false;}
 }
 const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 async function ready(){
  if(finished||failed)return;
  set(96);status='小屋准备好了，欢迎进来。';paint();
  await nextPaint();
  if(failed)return;
  finished=true;clearTimeout(slow);value=100;ensure();paint();
  try{sessionStorage.setItem(key,'true');}catch{}
  html.classList.remove('house-intro-pending');
  document.body.classList.remove('is-loading');document.body.dataset.loadingComplete='true';document.body.dataset.loaderResult='intro-ready';
  await nextPaint();
  overlay.classList.add('is-leaving');
  const close=()=>{clearTimeout(closing);overlay.hidden=true;};
  overlay.addEventListener('transitionend',close,{once:true});closing=setTimeout(close,reduced?0:450);
 }
 const slow=setTimeout(()=>{if(finished||failed)return;status='网络有点慢，小屋还在路上…';ensure();paint();if(overlay)overlay.querySelector('button').hidden=false;},30000);
 window.houseIntroLoader={active:true,plan,transfer,complete,stage(message){if(!finished&&!failed){status=message;paint();}},fail,ready,started(){set(3);}};
 // The shared loader skips initialization only on this opening visit.
 window.portfolioLoader={version:'conditional-v1',kind:'house-opening',ready};
 window.addEventListener('error',fail,true);
 window.addEventListener('unhandledrejection',fail);
 window.addEventListener('pageshow',event=>{if(event.persisted){finished=true;clearTimeout(slow);clearTimeout(closing);html.classList.remove('house-intro-pending');document.body.classList.remove('is-loading');if(overlay)overlay.hidden=true;}});
 window.houseIntroMount=ensure;
 plan(Object.keys(sizes));
 if(document.body)ensure();else document.addEventListener('DOMContentLoaded',ensure,{once:true});
})();
