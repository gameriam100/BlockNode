ART.EXPORT_SCALE = 8; // Higher scale = sharper texture when the SVG is rasterized by the browser/engine

ART.isEmpty = () => ART.grid.every(r => r.every(c => !c));

ART.toSVG = k => {
  const s = ART.GRID * k;
  // Pure SVG (vector). width/height only control the rasterization size when loaded as <img> or texture.
  // viewBox keeps the coordinate system at the original grid size so the art stays pixel-perfect.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${ART.GRID} ${ART.GRID}" shape-rendering="crispEdges">
${ART.rects()}
</svg>`;
};

ART.svgURL = k => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ART.toSVG(k));

ART.nextName = () => {
  let i = 1;
  while (assets.some(a => a.name === `art_${i}.svg`)) i++;
  return `art_${i}.svg`;
};

ART.addAsset = assign => {
  if (ART.isEmpty()) return setStatus('Art is empty');
  const a = {
    id: uid('a'),
    name: ART.nextName(),
    type: 'image',
    kind: 'art',
    url: ART.svgURL(ART.EXPORT_SCALE), // SVG data-URL (vector source)
    folderId: null
  };
  // Avoid duplicate if same SVG already exists
  const dup = assets.find(x => x.url === a.url && x.name === a.name);
  if (dup) {
    const n = selectedNode();
    if (assign && n && n.type === 'Sprite2D') {
      n.props.texture = dup.id;
      renderInspector();
      setStatus('Assigned existing ' + dup.name);
    } else setStatus(dup.name + ' already in Assets');
    return;
  }
  assets.push(a);

  // Note: the browser still rasterizes the SVG when creating the Image for texture use.
  // Higher EXPORT_SCALE makes that rasterization high-resolution so it stays sharp.
  const im = new Image();
  im.src = a.url;
  imgCache[a.id] = im;

  const n = selectedNode();
  const assigned = assign && n && n.type === 'Sprite2D';
  if (assigned) n.props.texture = a.id;

  renderAssets();
  renderInspector();
  setStatus(assigned
    ? `Exported ${a.name} and assigned to ${n.name}`
    : `Exported ${a.name} to Assets`);
};
