// ── MOBILE PANELS ──
function isMobile(){return window.matchMedia('(max-width:900px)').matches;}
function toggleMobilePanel(side){
  const left=$('left-slot'),right=$('right-slot'),scrim=$('overlay-scrim');
  if(side==='left'){
    const open=left.classList.toggle('open');
    right.classList.remove('open');
    scrim.classList.toggle('show',open);
  }else{
    const open=right.classList.toggle('open');
    left.classList.remove('open');
    scrim.classList.toggle('show',open);
  }
}
function closeMobilePanels(){
  $('left-slot')?.classList.remove('open');
  $('right-slot')?.classList.remove('open');
  $('overlay-scrim')?.classList.remove('show');
}
const _origSetView=setView;
setView=function(v){
  _origSetView(v);
  closeMobilePanels();
  document.querySelectorAll('#mobile-bar button').forEach(b=>b.classList.remove('on'));
  const map={script:'mob-script',scene:'mob-scene',split:'mob-scene',assets:'mob-assets'};
  const btn=$(map[v]);if(btn)btn.classList.add('on');
};
// Prevent body scroll when drawer open on iOS
document.addEventListener('touchmove',e=>{
  if($('overlay-scrim')?.classList.contains('show')&&!e.target.closest('#left-slot,#right-slot')){
    e.preventDefault();
  }
},{passive:false});

