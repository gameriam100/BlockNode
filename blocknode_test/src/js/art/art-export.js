ART.EXPORT_SCALE=1;
ART.isEmpty=()=>ART.grid.every(r=>r.every(c=>!c));
ART.toSVG=k=>{
  const s=ART.GRID*k;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${ART.GRID} ${ART.GRID}" shape-rendering="crispEdges">${ART.rects()}</svg>`;
};
ART.svgURL=k=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ART.toSVG(k));
ART.nextName=()=>{
  let i=1;
  while(assets.some(a=>a.name===`art_${i}.svg`))i++;
  return `art_${i}.svg`;
};
ART.addAsset=assign=>{
  if(ART.isEmpty())return setStatus('Art is empty');
  const a={id:uid('a'),name:ART.nextName(),url:ART.svgURL(ART.EXPORT_SCALE)};
  assets.push(a);
  const im=new Image();
  im.src=a.url;
  imgCache[a.id]=im;
  const n=selectedNode();
  const assigned=assign&&n&&n.type==='Sprite2D';
  if(assigned)n.props.texture=a.id;
  renderAssets();
  renderInspector();
  setStatus(assigned?`Exported ${a.name} and assigned to ${n.name}`:`Exported ${a.name} to Assets`);
};
