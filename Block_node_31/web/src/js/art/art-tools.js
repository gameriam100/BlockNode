ART.paint=(x,y,col)=>{
  const o=Math.floor(ART.size/2);
  for(let j=0;j<ART.size;j++)for(let i=0;i<ART.size;i++){
    const px=x-o+i,py=y-o+j;
    if(px>=0&&py>=0&&px<ART.GRID&&py<ART.GRID)ART.grid[py][px]=col;
  }
};
ART.stroke=(x0,y0,x1,y1,col)=>{
  const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
  let err=dx-dy;
  for(;;){
    ART.paint(x0,y0,col);
    if(x0===x1&&y0===y1)break;
    const e2=2*err;
    if(e2>-dy){err-=dy;x0+=sx;}
    if(e2<dx){err+=dx;y0+=sy;}
  }
};
ART.fill=(x,y,col)=>{
  const target=ART.grid[y][x];
  if(target===col)return;
  const stack=[[x,y]];
  while(stack.length){
    const[cx,cy]=stack.pop();
    if(cx<0||cy<0||cx>=ART.GRID||cy>=ART.GRID||ART.grid[cy][cx]!==target)continue;
    ART.grid[cy][cx]=col;
    stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
  }
};
ART.paintShape=(x,y,col,shape)=>{
  const o=Math.floor(ART.size/2),r=ART.size/2;
  for(let j=0;j<ART.size;j++)for(let i=0;i<ART.size;i++){
    const px=x-o+i,py=y-o+j;
    if(px<0||py<0||px>=ART.GRID||py>=ART.GRID)continue;
    if(shape==='circle'){
      const dx=i+0.5-r,dy=j+0.5-r;
      if(dx*dx+dy*dy>r*r)continue;
    }
    ART.grid[py][px]=col;
  }
};
ART.strokeShape=(x0,y0,x1,y1,col,shape)=>{
  const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
  let err=dx-dy;
  for(;;){
    ART.paintShape(x0,y0,col,shape);
    if(x0===x1&&y0===y1)break;
    const e2=2*err;
    if(e2>-dy){err-=dy;x0+=sx;}
    if(e2<dx){err+=dx;y0+=sy;}
  }
};
ART.pushColorHist=c=>{
  if(!c)return;
  ART.colorHist=ART.colorHist.filter(x=>x!==c);
  ART.colorHist.unshift(c);
  if(ART.colorHist.length>8)ART.colorHist.length=8;
  if(typeof ART.renderColorHist==='function')ART.renderColorHist();
};
ART.setColor=c=>{
  ART.color=c;
  const i=$('art-color');if(i)i.value=c;
  ART.pushColorHist(c);
};
ART.TOOLS={
  pencil:{icon:'✏️',tip:'Pencil (right-click erases)',down:(x,y,c)=>ART.stroke(x,y,x,y,c),move:(x,y,c,l)=>ART.stroke(l[0],l[1],x,y,c)},
  eraser:{icon:'🧽',tip:'Eraser',down:(x,y)=>ART.stroke(x,y,x,y,null),move:(x,y,c,l)=>ART.stroke(l[0],l[1],x,y,null)},
  fill:{icon:'🪣',tip:'Fill (right-click erases)',down:(x,y,c)=>ART.fill(x,y,c)},
  pick:{icon:'💧',tip:'Eyedropper',down:(x,y)=>{const c=ART.grid[y][x];if(c)ART.setColor(c);}},
  square:{icon:'■',tip:'Square brush (right-click erases)',down:(x,y,c)=>ART.paintShape(x,y,c,'square'),move:(x,y,c,l)=>ART.strokeShape(l[0],l[1],x,y,c,'square')},
  circle:{icon:'●',tip:'Circle brush (right-click erases)',down:(x,y,c)=>ART.paintShape(x,y,c,'circle'),move:(x,y,c,l)=>ART.strokeShape(l[0],l[1],x,y,c,'circle')}
};
