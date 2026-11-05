const ART={
  GRID:32,CELL:16,MAX_HIST:30,
  GRIDS:[8,16,24,32,48,64,96,128],
  COLORS:['#000000','#ffffff','#ff0000','#00aa00','#0000ff','#ffff00','#ff00ff','#00ffff','#ff8800','#8800ff'],
  SIZES:[1,2,3,4,6,8],
  tool:'pencil',color:'#000000',size:1,showGrid:true,grid:null,hist:{undo:[],redo:[]},
  last:null,erase:false,drawing:false,ready:false
};
ART.newGrid=(n=ART.GRID)=>Array.from({length:n},()=>Array(n).fill(null));
ART.grid=ART.newGrid();
ART.encode=()=>({n:ART.GRID,rows:ART.grid.map(row=>{
  const out=[];
  for(let x=0;x<row.length;){
    const c=row[x];
    let k=1;
    while(row[x+k]===c)k++;
    out.push([c,k]);
    x+=k;
  }
  return out;
})});
ART.decode=d=>{
  const n=d&&d.n;
  if(!ART.GRIDS.includes(n)||!Array.isArray(d.rows)||d.rows.length!==n)return null;
  const grid=[];
  for(const runs of d.rows){
    if(!Array.isArray(runs))return null;
    const row=[];
    for(const[c,k]of runs){
      if(c!==null&&!/^#[0-9a-f]{6}$/i.test(c))return null;
      for(let i=0;i<k&&row.length<n;i++)row.push(c);
    }
    if(row.length!==n)return null;
    grid.push(row);
  }
  return grid;
};
ART.snap=()=>JSON.stringify(ART.encode());
ART.pushHistory=()=>{
  ART.hist.undo.push(ART.snap());
  if(ART.hist.undo.length>ART.MAX_HIST)ART.hist.undo.shift();
  ART.hist.redo=[];
};
ART.step=(from,to)=>{
  if(!from.length)return false;
  const g=ART.decode(JSON.parse(from[from.length-1]));
  if(!g)return false;
  to.push(ART.snap());
  from.pop();
  ART.grid=g;
  ART.GRID=g.length;
  return true;
};
ART.undoStep=()=>ART.step(ART.hist.undo,ART.hist.redo);
ART.redoStep=()=>ART.step(ART.hist.redo,ART.hist.undo);
ART.clear=()=>{ART.pushHistory();ART.grid=ART.newGrid();};
ART.resize=n=>{
  if(n===ART.GRID||!ART.GRIDS.includes(n))return false;
  ART.pushHistory();
  const next=ART.newGrid(n),m=Math.min(n,ART.GRID);
  for(let y=0;y<m;y++)for(let x=0;x<m;x++)next[y][x]=ART.grid[y][x];
  ART.grid=next;
  ART.GRID=n;
  return true;
};
ART.serialize=()=>({...ART.encode(),showGrid:ART.showGrid});
ART.loadData=d=>{
  const g=ART.decode(d);
  ART.GRID=g?d.n:32;
  ART.grid=g||ART.newGrid();
  ART.showGrid=!d||d.showGrid!==false;
  ART.hist={undo:[],redo:[]};
  if(ART.render&&$('art-svg'))ART.render();
};
