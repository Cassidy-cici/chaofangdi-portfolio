/* Shared approved dot-eating loader. Show only while readiness exceeds 300ms. */
(()=>{
 if(window.portfolioLoader?.version==='conditional-v1')return;
 const started=performance.now(),delay=300,ceiling=15000;
 const html=document.documentElement;
 html.classList.add('portfolio-pending');
 let finished=false,shown=false,overlay=null,rotation=null,readyPromise=null;
 const lines=['再吃一颗小圆点…','嚼嚼…马上就好啦'];
 let line=Math.random()<.5?0:1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const markup='<div class="loader-scene" aria-hidden="true"><div class="loader-conveyor">'+'<i></i>'.repeat(9)+'</div><div class="loader-character"><span class="loader-mouth-top"></span><span class="loader-mouth-bottom"></span></div></div><p class="loader-caption"></p>';
 function ensureOverlay(){
  if(!document.body)return null;
  overlay=document.getElementById('portfolio-loader');
  if(!overlay){overlay=document.createElement('div');overlay.id='portfolio-loader';overlay.hidden=true;overlay.setAttribute('role','status');overlay.setAttribute('aria-label','页面加载中');overlay.innerHTML=markup;document.body.appendChild(overlay);}
  overlay.querySelector('.loader-caption').textContent=lines[line];
  return overlay;
 }
 function show(){
  if(finished)return;
  if(!ensureOverlay()){document.addEventListener('DOMContentLoaded',show,{once:true});return;}
  shown=true;overlay.hidden=false;document.body.classList.add('is-loading');
  document.body.dataset.loaderShown='true';
  if(!reduced)rotation=setInterval(()=>{line=1-line;overlay.querySelector('.loader-caption').textContent=lines[line];},1500);
 }
 const timer=setTimeout(show,delay);
 function finish(reason='ready'){
  if(finished)return;
  finished=true;clearTimeout(timer);clearTimeout(safety);clearInterval(rotation);
  if(overlay)overlay.hidden=true;
  html.classList.remove('portfolio-pending');
  if(document.body){document.body.classList.remove('is-loading');Object.assign(document.body.dataset,{loadingComplete:'true',loaderShown:String(shown),loaderResult:reason,loaderElapsed:String(Math.round(performance.now()-started))});}
 }
 const safety=setTimeout(()=>finish('timeout'),ceiling);
 function bounded(promise,ms){return new Promise(resolve=>{const id=setTimeout(resolve,ms);Promise.resolve(promise).catch(()=>{}).then(()=>{clearTimeout(id);resolve();});});}
 const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 async function waitForPage(){
  await nextPaint();
  const images=[...document.querySelectorAll('img')].filter(image=>{
   if(image.closest('dialog:not([open])'))return false;
   const bounds=image.getBoundingClientRect();
   return bounds.width>0&&bounds.height>0&&bounds.bottom>0&&bounds.right>0&&bounds.top<innerHeight&&bounds.left<innerWidth;
  });
  await Promise.all([bounded(document.fonts?.ready,5000),...images.map(image=>bounded(image.complete?image.decode?.():new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});}),8000))]);
  finish();
 }
 window.portfolioLoader={version:'conditional-v1',delay,ready(){return readyPromise??=(async()=>{try{await waitForPage();}finally{finish();}})();}};
 window.addEventListener('pageshow',event=>{if(event.persisted)finish('restored');});
})();
