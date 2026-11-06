ART.svgEl=()=>$('art-svg');
ART.rects=()=>{
  let out='';
  ART.grid.forEach((row,y)=>{
    for(let x=0;x<ART.GRID;){
      const c=row[x];
      if(!c){x++;continue;}
      let n=1;
      while(row[x+n]===c)n++;
      out+=`<rect x="${x}" y="${y}" width="${n}" height="1" fill="${c}"/>`;
      x+=n;
    }
  });
  return out;
};
ART.render=()=>{
  const s=ART.svgEl(),g=ART.GRID,p=100/g;
  s.setAttribute('viewBox',`0 0 ${g} ${g}`);
  s.style.setProperty('--art-n',g);
  s.style.backgroundSize=`${p}% ${p}%`;
  s.classList.toggle('no-grid',!ART.showGrid);
  s.innerHTML=ART.rects();
  const sel=$('art-canvas-size'),gb=$('art-grid-btn');
  if(sel)sel.value=g;
  if(gb)gb.classList.toggle('on',ART.showGrid);
  ART.status();
};
ART.cellAt=e=>{
  const r=ART.svgEl().getBoundingClientRect();
  return[Math.floor((e.clientX-r.left)/r.width*ART.GRID),Math.floor((e.clientY-r.top)/r.height*ART.GRID)];
};
ART.status=()=>{$('art-status').textContent=`${ART.tool} • brush ${ART.size} • canvas ${ART.GRID}×${ART.GRID}`;};
ART.exportSVG=()=>{
  const a=document.createElement('a');
  a.href=ART.svgURL(ART.CELL);
  a.download='drawing.svg';
  a.click();
};
ART.history=fn=>{if(fn())ART.render();};
ART.ACTIONS=[
  ['↶','Undo (Ctrl+Z)',()=>ART.history(ART.undoStep)],
  ['↷','Redo (Ctrl+Y)',()=>ART.history(ART.redoStep)],
  ['🗑','Clear',()=>{ART.clear();ART.render();}],
  ['💾','Download SVG',ART.exportSVG],
  ['🖼','Export SVG to Assets',()=>ART.addAsset(false)],
  ['🎯','Export SVG and assign to selected Sprite2D',()=>ART.addAsset(true)]
];
ART.button=(parent,label,tip,fn,cls='')=>{
  const b=document.createElement('button');
  b.type='button';b.textContent=label;b.title=tip;b.className='art-btn '+cls;b.onclick=fn;
  parent.appendChild(b);
  return b;
};
ART.group=title=>{
  const h=document.createElement('div');
  h.innerHTML=`<h4>${title}</h4><div class="art-row"></div>`;
  $('art-side').appendChild(h);
  return h.lastChild;
};
ART.mark=(row,i)=>[...row.children].forEach((b,j)=>b.classList.toggle('on',i===j));
ART.buildUI=()=>{
  const tools=ART.group('Tools');
  Object.entries(ART.TOOLS).forEach(([k,t],i)=>ART.button(tools,t.icon,t.tip,()=>{ART.tool=k;ART.mark(tools,i);ART.status();}));
  ART.mark(tools,0);
  const col=ART.group('Color');
  const inp=document.createElement('input');
  inp.type='color';inp.id='art-color';inp.value=ART.color;
  inp.oninput=()=>{ART.color=inp.value;ART.pushColorHist(inp.value);};
  col.before(inp);
  const hist=document.createElement('div');
  hist.className='art-color-hist';hist.id='art-color-hist';
  col.before(hist);
  ART.renderColorHist=()=>{
    const h=$('art-color-hist');if(!h)return;
    h.innerHTML='';
    (ART.colorHist||[]).forEach(c=>{
      const b=document.createElement('button');
      b.type='button';b.className='art-btn sw hist';b.style.background=c;b.title=c;
      b.onclick=()=>ART.setColor(c);
      h.appendChild(b);
    });
  };
  ART.COLORS.forEach(c=>{const b=ART.button(col,'',c,()=>ART.setColor(c),'sw');b.style.background=c;});
  ART.pushColorHist(ART.color);
  ART.renderColorHist();
  const cv=ART.group('Canvas');
  const sel=document.createElement('select');
  sel.id='art-canvas-size';sel.className='art-select';
  sel.innerHTML=ART.GRIDS.map(n=>`<option value="${n}">${n}×${n}</option>`).join('');
  sel.onchange=()=>{ART.resize(+sel.value);ART.render();};
  cv.appendChild(sel);
  const gb=ART.button(cv,'▦','Toggle grid',()=>{ART.showGrid=!ART.showGrid;ART.render();});
  gb.id='art-grid-btn';
  const sizes=ART.group('Brush');
  ART.SIZES.forEach((n,i)=>ART.button(sizes,n,'Brush '+n,()=>{ART.size=n;ART.mark(sizes,i);ART.status();}));
  ART.mark(sizes,0);
  const acts=ART.group('Actions');
  ART.ACTIONS.forEach(([i,t,f])=>ART.button(acts,i,t,f));
};
ART.panning=false;ART.panLast=null;
ART.down=e=>{
  // Middle mouse: pan the art canvas inside #art-wrap
  if(e.button===1){
    e.preventDefault();
    ART.panning=true;ART.drawing=false;
    ART.panLast=[e.clientX,e.clientY];
    const wrap=$('art-wrap');
    if(wrap)wrap.style.cursor='grabbing';
    ART.svgEl().setPointerCapture(e.pointerId);
    return;
  }
  const t=ART.TOOLS[ART.tool];
  if(!t)return;
  ART.erase=e.button===2;
  const[x,y]=ART.cellAt(e);
  if(x<0||y<0||x>=ART.GRID||y>=ART.GRID)return;
  if(ART.tool!=='pick')ART.pushHistory();
  ART.drawing=true;ART.last=[x,y];
  ART.svgEl().setPointerCapture(e.pointerId);
  t.down(x,y,ART.erase?null:ART.color);
  ART.render();
};
ART.move=e=>{
  if(ART.panning&&ART.panLast){
    const wrap=$('art-wrap');
    if(wrap){
      const dx=e.clientX-ART.panLast[0],dy=e.clientY-ART.panLast[1];
      wrap.scrollLeft-=dx;wrap.scrollTop-=dy;
      ART.panLast=[e.clientX,e.clientY];
    }
    return;
  }
  const t=ART.TOOLS[ART.tool];
  if(!ART.drawing||!t||!t.move)return;
  const[x,y]=ART.cellAt(e);
  t.move(x,y,ART.erase?null:ART.color,ART.last);
  ART.last=[x,y];
  ART.render();
};
ART.up=()=>{
  ART.drawing=false;
  if(ART.panning){
    ART.panning=false;ART.panLast=null;
    const wrap=$('art-wrap');
    if(wrap)wrap.style.cursor='';
  }
};
ART.keys=e=>{
  if(view!=='art'||(!e.ctrlKey&&!e.metaKey))return;
  const k=e.key.toLowerCase();
  if(k==='z'){e.preventDefault();e.stopImmediatePropagation();ART.history(ART.undoStep);}
  else if(k==='y'||k==='u'){e.preventDefault();e.stopImmediatePropagation();ART.history(ART.redoStep);}
};
function initArt(){
  if(!ART.ready){
    ART.ready=true;
    ART.buildUI();
    const s=ART.svgEl();
    s.onpointerdown=ART.down;s.onpointermove=ART.move;
    s.onpointerup=s.onpointercancel=ART.up;
    s.oncontextmenu=e=>e.preventDefault();
    window.addEventListener('keydown',ART.keys,true);
  }
  ART.render();
}
