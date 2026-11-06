// ── MODAL ──
$('scene-name-input').addEventListener('keydown',e=>{if(e.key==='Enter')confirmNewScene();});
$('modal-overlay').addEventListener('click',e=>{if(e.target.id==='modal-overlay')closeModal();});

