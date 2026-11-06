// ── GUTTERS (resize) ──
const GUT={};

function dragGutter(el,{filter,start,move}){
  el.onpointerdown=e=>{
    if(filter&&!filter(e))return;
    e.preventDefault();el.setPointerCapture(e.pointerId);el.classList.add('on');
    const x0=e.clientX,y0=e.clientY,s0=start();
    el.onpointermove=ev=>move(s0,ev.clientX-x0,ev.clientY-y0);
    el.onpointerup=()=>{el.classList.remove('on');el.onpointermove=null;saveSettings();};
  };
}

function sideGutter(gutEl,slotId,key,cssVar,sign){
  const slot=$(slotId);
  dragGutter(gutEl,{
    start:()=>settings.layout[key],
    move:(s0,dx)=>{
      // Keep enough room for the center canvas + top ribbon so buttons never crush into each other
      const minW = key==="rw" ? 220 : 180;
      const maxW = key==="rw" ? 520 : 380;
      const w=settings.layout[key]=clamp(s0+sign*dx, minW, maxW);
      slot.style.width=slot.style.flexBasis=w+'px';
      document.documentElement.style.setProperty(cssVar,w+'px');
    }
  });
  gutEl.ondblclick=()=>{settings.layout[key]=DEF_LAYOUT[key];slot.style.width=DEF_LAYOUT[key]+'px';saveSettings();};
}

function setRightSlotSplit(pct){
  pct=clamp(pct,15,85);
  settings.layout.propsPct=pct;
  const props=$('sp-props');
  if(props){
    props.style.setProperty('--sh',pct+'%');
    const headH=props.querySelector('.slot-panel-head')?.offsetHeight||26;
    const body=$('sp-props-body');
    if(body&&!slotCollapsed.has('sp-props'))body.style.height=Math.max(60,$('right-slot').getBoundingClientRect().height*pct/100-headH)+'px';
  }
  saveSettings();
}

(()=>{
  const dbgBar=$('debug-panel'),panel=$('canvas-panel'),slot=$('right-slot');

  sideGutter($('gut-left'),'left-slot','lw','--left-w',1);
  sideGutter($('gut-right'),'right-slot','rw','--right-w',-1);

  const pvGut=$('gut-pv');
  dragGutter(pvGut,{
    start:()=>settings.layout.splitPrev||40,
    move:(s0,_,dy)=>{
      const pct=settings.layout.splitPrev=clamp(s0+dy/panel.getBoundingClientRect().height*100,15,50);
      panel.style.setProperty('--split-prev',pct+'%');
    }
  });
  pvGut.ondblclick=()=>{settings.layout.splitPrev=40;panel.style.setProperty('--split-prev','40%');saveSettings();};

  const dbgGut=GUT.dh=document.createElement('div');
  dbgGut.className='gutter h hide';dbgBar.before(dbgGut);
  dragGutter(dbgGut,{
    start:()=>settings.layout.dh,
    move:(s0,_,dy)=>dbgBar.style.setProperty('--dh',(settings.layout.dh=clamp(s0-dy,60,500))+'px')
  });

  const splitDrag=(el,filter)=>dragGutter(el,{
    filter,
    start:()=>settings.layout.propsPct||75,
    move:(s0,_,dy)=>setRightSlotSplit(s0+dy/(slot.getBoundingClientRect().height||1)*100)
  });
  const grip=$('right-slot-grip');
  splitDrag(grip);
  grip.ondblclick=()=>{setRightSlotSplit(50);setStatus('Panels 50 / 50');};
  splitDrag($('sp-props-head'),e=>!e.target.closest('button,input,select,.sp-toggle'));

  // Prefer ~75/25 props/script split if never customized far from default
  if(settings.layout.propsPct==null||settings.layout.propsPct===45||settings.layout.propsPct===75) settings.layout.propsPct=55;
  setRightSlotSplit(settings.layout.propsPct||75);
  window.addEventListener('resize',()=>{if(settings.layout.propsPct)setRightSlotSplit(settings.layout.propsPct);});
})();
