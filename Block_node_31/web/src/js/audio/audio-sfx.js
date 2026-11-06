// AUDIO SFX — seeded sfxr-style blip synth (4x oversampled, exported as tiny 8-bit WAV).
(A=>{
const {v,pick,rngOf,sgn,kb,baseOf,W,SR,OS}=A;
const NAMES=['Coin','Jump','Laser','Explosion','Power-up','Hit','Blip','Zap','Pickup','Alarm'];
A.SQ=[[11025,8],[22050,8]];
A.sfxDefs=[
  {id:'wave',l:'Waveform',g:['Auto','Square','Saw','Tri','Sine','Noise']},
  {id:'pitch',l:'Pitch',a:-24,b:24,v:0,f:x=>sgn(x)+' st'},
  {id:'pvar',l:'Pitch variation',a:0,b:100,v:0,f:x=>x+'%'},
  {id:'len',l:'Duration',a:.3,b:3,s:.05,v:1,f:x=>x.toFixed(2)+'x'},
  {id:'punch',l:'Punch',a:0,b:100,v:30,f:x=>x+'%'},
  {id:'slide',l:'Sweep',a:-2,b:2,s:.1,v:0,f:x=>sgn(x.toFixed(1))},
  {id:'wob',l:'Wobble',a:0,b:100,v:0,f:x=>x+'%'},
  {id:'rep',l:'Retrigger',a:0,b:8,v:0,f:x=>x?x+'x':'off'},
  {id:'lpf',l:'Low-pass',a:10,b:100,v:100,f:x=>x+'%'},
  {id:'hpf',l:'High-pass',a:0,b:90,v:0,f:x=>x+'%'},
  {id:'crunch',l:'Bit crush',a:0,b:6,v:0},
  {id:'svol',l:'Volume',a:.1,b:1,s:.05,v:.6,f:x=>Math.round(x*100)+'%'},
  {id:'sq',l:'Download size',g:['Tiny 8-bit 11k','Small 8-bit 22k']}
];
A.sfxSeedIds=['wave','pitch','pvar','len','punch','slide','wob','rep','lpf','hpf','crunch'];
A.sfxSeedDefs=['0','0','0','1','30','0','0','0','100','0','0'];
function params(r,t){
  const R=(a,b)=>a+r()*(b-a),semi=n=>2**(n/12),pk=a=>pick(r,a);
  return Object.assign({w:0,f:440,fmin:0,sl:0,vd:0,vs:14,at:0,af:1,an:0,alt:0,du:.5,ds:0,a:.002,s:.08,dc:.2,lp:1,hp:0},[
    {f:R(900,1500),at:R(.04,.08),af:semi(pk([5,7,12])),an:1,s:R(.05,.1),dc:R(.15,.3)},
    {f:R(180,340),sl:R(1,2.2),s:R(.06,.14),dc:R(.1,.2),du:R(.3,.5)},
    {w:pk([0,1]),f:R(1200,2600),sl:-R(3,6),fmin:120,du:R(.1,.4),ds:-R(0,.5),s:R(.03,.1),dc:R(.1,.2)},
    {w:4,f:R(500,1500),sl:-R(.5,2),s:R(.1,.35),dc:R(.4,.9),lp:R(.25,.5)},
    {w:pk([0,1]),f:R(220,420),sl:R(.5,1.5),vd:.03,vs:15,at:R(.05,.08),af:semi(pk([3,4,5,7])),an:2+(r()*4|0),s:R(.15,.3),dc:R(.2,.4),du:pk([.25,.5])},
    {w:4,f:R(400,1000),sl:-R(2,5),s:R(.02,.05),dc:R(.1,.18),lp:R(.5,.9)},
    {w:pk([0,2]),f:R(500,1800),s:R(.03,.08),dc:R(.03,.08)},
    {w:1,f:R(600,1500),sl:-R(2,5),vd:R(.1,.25),vs:R(25,45),s:R(.04,.1),dc:R(.12,.25),hp:.1},
    {f:R(500,900),sl:R(2,4),ds:R(.3,.6),du:.15,s:R(.05,.12),dc:R(.1,.2),at:R(.05,.08),af:semi(pk([4,7])),an:1},
    {f:R(400,800),at:R(.08,.12),af:semi(pk([5,7,12])),an:99,alt:1,s:R(.4,.8),dc:.1}
  ][t]);
}
A.sfxRender=()=>{
  const base=baseOf('sseed'),r=rngOf('s'+base),t=r()*10|0,p=params(r,t);
  const L=v('len'),pv=v('pvar')/100,wo=v('wave'),wb=v('wob')/100,sh=2**(v('pitch')/12);
  p.f*=sh;p.fmin*=sh;p.s*=L;p.dc*=L;p.at*=L;p.sl=p.sl/L+v('slide')*1.5;
  p.vd+=wb*.25;if(wb&&!p.vs)p.vs=14;if(wb)p.vs=Math.max(p.vs,8+wb*24);if(wo)p.w=wo-1;
  const punch=v('punch')/100,rep=v('rep'),lp=Math.min(p.lp,v('lpf')/100),hp=Math.max(p.hp,v('hpf')/100);
  const T=p.a+p.s+p.dc,repT=rep?T/(rep+1):0,N=Math.max(100,T*SR|0),o=new Float32Array(N);
  const rn=rngOf('n'+base),rj=rngOf('v'+base),lc=Math.max(.004,lp*lp*lp),hc=hp*hp*.05,jn=Math.round(.035*SR);
  let ph=0,nv=0,l1=0,l2=0,hz=0,jit=1,end=N;
  for(let i=0;i<N;i++){
    const tt=i/SR,tr=repT?tt%repT:tt;
    if(i%jn==0&&pv)jit=2**(Math.round((rj()*2-1)*pv*12)/12);
    const st=p.at?Math.min(Math.floor(tr/p.at),p.an):0,m=p.alt?(st%2?p.af:1):p.af**st;
    const fr=p.f*2**(p.sl*tr)*m*jit*(1+p.vd*Math.sin(6.2832*p.vs*tt));
    if(p.fmin&&fr<p.fmin){end=i;break;}
    const inc=Math.min(fr,9000)/(SR*OS),d=Math.min(.9,Math.max(.1,p.du+p.ds*tt));
    let x=0;
    for(let k=0;k<OS;k++){ph+=inc;if(ph>=1){ph-=1;nv=rn()*2-1;}x+=W(p.w,ph,d,nv);}
    x/=OS;
    const e=tt<p.a?tt/p.a:tt<p.a+p.s?1+(1-(tt-p.a)/p.s)*2*punch:Math.max(0,1-(tt-p.a-p.s)/p.dc)**1.5;
    x*=e;
    l1+=lc*(x-l1);l2+=lc*(l1-l2);hz+=hc*(l2-hz);
    o[i]=l2-hz;
  }
  let pkv=0;const out=o.slice(0,end);
  for(let i=0;i<end;i++)pkv=Math.max(pkv,Math.abs(out[i]));
  const g=pkv?v('svol')/pkv:0,c=v('crunch');
  for(let i=0;i<end;i++)out[i]*=g;
  if(c){const k=1+c,q=2**(7-c);let h=0;for(let i=0;i<end;i++){if(i%k==0)h=Math.round(out[i]*q)/q;out[i]=h;}}
  A.sfx.data=out;A.draw(A.el('sw'),out);
  A.el('sinfo').textContent=`${NAMES[t]}, ${(end/SR).toFixed(2)} s`;
  A.sfxSize();
};
A.sfxSize=()=>{
  const d=A.sfx.data;if(!d)return;
  const[sr,bits]=A.SQ[v('sq')];
  A.el('ssave').textContent=`Download WAV, ${kb(44+Math.floor(d.length*sr/SR)*bits/8)}`;
};
A.sfxPlay=()=>{
  try{A.sfx.src&&A.sfx.src.s.stop();}catch(e){}
  A.sfx.src=A.play(A.sfx.data,SR,false,1);
};
A.sfxGo=(go=true)=>{A.sfxRender();if(go)A.sfxPlay();if(typeof syncEditingCustomAudio==='function')syncEditingCustomAudio('sfx');};
A.sfxSave=()=>A.save(A.sfx.data,[SR,A.SQ[v('sq')][0]],8,'seedblip-sfx-'+baseOf('sseed'));
})(AUDIO);
