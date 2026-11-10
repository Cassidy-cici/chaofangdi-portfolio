/* One readiness-driven loader for the opening, pages and artwork readers. */
(()=>{
 if(window.portfolioLoader?.version==='house-progress-v2')return;
 const options=window.portfolioLoaderOptions||{},started=performance.now(),delay=300;
 const html=document.documentElement,records=new Map(),sizes=options.assets||{};
 html.classList.add('portfolio-pending');
 let finished=false,failed=false,shown=false,overlay=null,rotation=null,readyPromise=null,value=0,safety=null;
 let status='',line=0;
 const lines=['再吃一颗小圆点…','嚼嚼…马上就好啦'];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const normalize=url=>new URL(url,location.href).pathname;
 const level=progress=>progress===0?100:progress===100?0:(44-40*progress/100)/48*100;
 const outline='data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2048%2048%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23AE9B81%22%20stroke-width%3D%22.8%22%20stroke-linejoin%3D%22round%22%20stroke-linecap%3D%22round%22%3E%0A%20%20%20%20%3Cpath%20d%3D%22M4.5%2020.5%2021.6%205.6Q24%203.7%2026.4%205.6L43.5%2020.5Q46%2022.5%2043%2023H40V41Q40%2044%2037%2044H11Q8%2044%208%2041V23H5Q2%2022.5%204.5%2020.5Z%22%20%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2213.8%22%20y%3D%2228.5%22%20width%3D%227.6%22%20height%3D%227.3%22%20rx%3D%22.6%22%20%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M17.6%2028.7V35.6M14%2032.15H21.2%22%20stroke-width%3D%22.6%22%20%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M27%2044V34.8Q27%2030.4%2030.9%2030.4Q34.8%2030.4%2034.8%2034.8V44%22%20%2F%3E%0A%20%20%3C%2Fg%3E%0A%3C%2Fsvg%3E';
 const visualMarkup=progress=>'<div class="loader-scene" aria-hidden="true"><div class="loader-conveyor">'+'<i></i>'.repeat(9)+'</div><div class="loader-character"><span class="loader-mouth-top"></span><span class="loader-mouth-bottom"></span></div></div><p class="loader-caption">再吃一颗小圆点…</p><div class="loader-progress" role="progressbar" aria-label="加载进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"><div class="loader-number" aria-hidden="true"><span>'+progress+'</span><small>%</small></div><div class="loader-house" aria-hidden="true"><div class="loader-house-base"></div><div class="loader-house-fill"></div><img class="loader-house-outline" src="'+outline+'" alt=""></div></div>';
 function paint(){
  if(!overlay)return;
  overlay.style.setProperty('--loader-level',level(value)+'%');
  overlay.querySelector('.loader-number span').textContent=String(value);
  overlay.querySelector('.loader-progress').setAttribute('aria-valuenow',String(value));
  overlay.querySelector('.loader-caption').textContent=status||lines[line];
  overlay.dataset.progress=String(value);
 }
 function ensureOverlay(){
  if(!document.body)return null;
  if(!overlay){
   overlay=document.createElement('div');overlay.id='portfolio-loader';overlay.className='portfolio-loading-overlay';overlay.hidden=true;
   overlay.setAttribute('aria-label','页面加载中');overlay.innerHTML=visualMarkup(value)+'<button class="loader-retry" type="button" hidden>重新加载</button>';
   overlay.querySelector('button').addEventListener('click',()=>location.reload());document.body.appendChild(overlay);
  }
  paint();return overlay;
 }
 function show(){
  if(finished)return;
  if(!ensureOverlay()){document.addEventListener('DOMContentLoaded',show,{once:true});return;}
  if(shown)return;
  shown=true;overlay.hidden=false;document.body.classList.add('is-loading');document.body.dataset.loaderShown='true';
  if(!reduced&&!failed)rotation=setInterval(()=>{line=1-line;paint();},1500);
 }
 const timer=setTimeout(show,delay);
 function set(next){if(finished||failed)return;value=Math.max(value,Math.min(99,Math.floor(next)));paint();}
 function recalculate(){
  let loaded=0,total=0;
  for(const r of records.values()){total+=r.weight;loaded+=r.weight*(r.done?1:Math.min(.99,r.loaded/Math.max(1,r.total)));}
  if(total)set(8+84*loaded/total);
 }
 function plan(paths){
  const keep=new Set(paths.map(normalize));
  for(const path of records.keys())if(!keep.has(path))records.delete(path);
  for(const url of paths){const path=normalize(url);if(!records.has(path)){const size=sizes[url.replace(/^\.\//,'').split('?')[0]]||65536;records.set(path,{weight:size,total:size,loaded:0,done:false});}}
  recalculate();
 }
 function transfer(url,loaded,total){const r=records.get(normalize(url));if(!r)return;r.loaded=Math.max(r.loaded,loaded);if(total>0)r.total=total;recalculate();}
 function complete(url){const r=records.get(normalize(url));if(!r)return;r.done=true;recalculate();}
 function cleanup(){clearTimeout(timer);clearTimeout(safety);clearTimeout(slow);clearInterval(rotation);}
 function finish(reason='ready'){
  if(finished)return;
  finished=true;cleanup();
  if(reason==='ready'){value=100;paint();}
  if(overlay)overlay.hidden=true;
  html.classList.remove('portfolio-pending');
  if(document.body){document.body.classList.remove('is-loading');Object.assign(document.body.dataset,{loadingComplete:'true',loaderShown:String(shown),loaderResult:reason,loaderElapsed:String(Math.round(performance.now()-started))});}
 }
 function fail(){
  if(finished||failed)return;failed=true;clearTimeout(safety);clearTimeout(slow);clearInterval(rotation);
  status='暂时没能加载完成，请再试一次。';show();paint();
  if(overlay){overlay.dataset.state='error';overlay.querySelector('button').hidden=false;}
 }
 const slow=setTimeout(()=>{if(finished||failed)return;status='网络有点慢，还在加载中…';show();paint();if(overlay)overlay.querySelector('button').hidden=false;},30000);
 if(options.timeout!==0)safety=setTimeout(()=>finish('timeout'),options.timeout||15000);
 function bounded(promise,ms){return new Promise(resolve=>{const id=setTimeout(resolve,ms);Promise.resolve(promise).catch(()=>{}).then(()=>{clearTimeout(id);resolve();});});}
 const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 async function waitForPage(){
  await nextPaint();if(finished||failed)return;set(8);
  const images=[...document.querySelectorAll('img')].filter(image=>{
   if(image.closest('#portfolio-loader,dialog:not([open])'))return false;
   const b=image.getBoundingClientRect();return b.width>0&&b.height>0&&b.bottom>0&&b.right>0&&b.top<innerHeight&&b.left<innerWidth;
  });
  let done=0;const total=images.length+1;
  const mark=()=>{done++;if(!options.manual)set(8+84*done/total);};
  await Promise.all([bounded(document.fonts?.ready,5000).then(mark),...images.map(image=>{
   if(image.complete)return bounded(image.decode?.(),8000).then(mark);
   return bounded(new Promise(resolve=>{const settle=()=>{image.removeEventListener('load',settle);image.removeEventListener('error',settle);resolve();};image.addEventListener('load',settle,{once:true});image.addEventListener('error',settle,{once:true});}),8000).then(mark);
  })]);
  if(finished||failed)return;set(96);await nextPaint();if(!failed)finish();
 }
 window.portfolioLoader={version:'house-progress-v2',delay,outline,level,visualMarkup,plan,transfer,complete,started(){set(3);},stage(message){if(!finished&&!failed){status=message;paint();}},fail,
  ready(){return readyPromise??=waitForPage();}};
 if(options.assets)plan(Object.keys(sizes));
 window.addEventListener('pageshow',event=>{if(event.persisted)finish('restored');});
 window.addEventListener('error',event=>{if(options.manual&&(!event.target||event.target===window||event.target.tagName==='SCRIPT'))fail();},true);
 window.addEventListener('unhandledrejection',()=>{if(options.manual)fail();});
})();
