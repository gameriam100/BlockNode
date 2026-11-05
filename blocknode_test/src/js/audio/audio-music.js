// AUDIO MUSIC — seeded loop composer (32 kHz render, notes wrap so the loop is seamless).
(A=>{
const {v,pick,rngOf,sgn,kb,baseOf,W,MS}=A;
const SCALES={Minor:[0,2,3,5,7,8,10],Major:[0,2,4,5,7,9,11],Dorian:[0,2,3,5,7,9,10],Phrygian:[0,1,3,5,7,8,10],Pentatonic:[0,2,4,7,9],'Minor pentatonic':[0,3,5,7,10]};
const SN=Object.keys(SCALES),KEYS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const PROGS=[[0,5,3,4],[0,3,4,3],[0,4,5,3],[0,5,2,4],[0,2,3,4],[5,3,0,4]];
const LW=[[0,.25],[0,.125],[0,.5],[1,.5],[2,.5]];
A.QUAL=[[11025,8],[22050,8],[32000,16]];
A.musDefs=[
  {id:'mlen',l:'Length',a:15,b:60,v:30,f:x=>x+' s'},
  {id:'voices',l:'Sounds at once',a:1,b:10,v:5,f:x=>x},
  {id:'tempo',l:'Tempo',a:40,b:200,s:5,v:40,f:x=>x<=40?'seed':x+' bpm'},
  {id:'tvar',l:'Tempo variation',a:0,b:100,v:0,f:x=>x+'%'},
  {id:'mpitch',l:'Pitch',a:-12,b:12,v:0,f:x=>sgn(x)+' st'},
  {id:'mpvar',l:'Pitch variation',a:0,b:100,v:0,f:x=>x+'%'},
  {id:'dens',l:'Melody density',a:.2,b:1,s:.05,v:.6,f:x=>Math.round(x*100)+'%'},
  {id:'mvol',l:'Volume',a:.1,b:1,s:.05,v:.6,f:x=>Math.round(x*100)+'%'},
  {id:'key',l:'Key',o:['From seed',...KEYS]},
  {id:'scale',l:'Scale',o:['From seed',...SN]},
  {id:'lead',l:'Lead sound',g:['Pulse 25','Pulse 12','Square','Saw','Tri']},
  {id:'q',l:'Download size',g:['Tiny 8-bit 11k','Small 8-bit 22k','Full 16-bit']}
];
A.musSeedIds=['mlen','voices','tempo','tvar','mpitch','mpvar','dens','key','scale','lead'];
A.musSeedDefs=['30','5','40','0','0','0','0.6','0','0','0'];
let NR;
function note(b,t,d,f,w,vol,o={}){
  const n=d*MS|0,s=t*MS|0,L=b.length,sl=o.sl||1,du=o.du||.5,dec=o.dec||1,a=(o.at||.004)*MS;
  let ph=0,nv=0;
  for(let i=0;i<n;i++){
    ph+=(sl==1?f:f*sl**(i/n))/MS;if(ph>=1){ph-=1;nv=NR()*2-1;}
    b[(s+i)%L]+=W(w,ph,du,nv)*Math.min(1,i/a)*(1-i/n)**dec*vol;
  }
}
function music(){
  const seed=baseOf('mseed'),R=k=>rngOf('m'+seed+k),r0=R('');NR=R('n');
  const aT=60+(r0()*100|0),aK=r0()*12|0,aS=r0()*SN.length|0;
  const bpm=v('tempo')>40?v('tempo'):aT,key=v('key')?v('key')-1:aK,si=v('scale')?v('scale')-1:aS;
  const nvc=v('voices'),tv=v('tvar')/100,pv=v('mpvar')/100;
  const sc=SCALES[SN[si]],n=sc.length,deg=d=>sc[(d%n+n)%n]+12*Math.floor(d/n);
  const root=48+key+v('mpitch'),mf=m=>440*2**((m-69)/12);
  const sd=60/bpm/4;let bars=Math.max(2,Math.round(v('mlen')*bpm/480)*2);
  while(bars*16*sd>60&&bars>2)bars-=2;
  const steps=bars*16;
  const rt=R('t'),raw=Array.from({length:bars},()=>1+(rt()*2-1)*.4*tv),mean=raw.reduce((a,x)=>a+x,0)/bars;
  const sdb=raw.map(x=>sd*x/mean),bs=[];let acc=0;sdb.forEach(x=>{bs.push(acc);acc+=x*16;});
  const b=new Float32Array(Math.round(acc*MS)),T=s=>bs[s>>4]+(s&15)*sdb[s>>4],D=(s,l)=>l*sdb[s>>4];
  const pr=pick(R('p'),PROGS),chordOf=k=>k%8==7?4:pr[k%4];
  const pj=rx=>pv?(rx()<pv*.7?pick(rx,[-12,-7,-5,-2,-1,1,2,5,7,12]):0)+(rx()-.5)*pv*.6:0;
  const cl=x=>Math.max(2,Math.min(12,x)),tones=c=>[-7,0,7].flatMap(o=>[c+o,c+o+2,c+o+4]);
  const ch0=[0,1,2,3].map(chordOf);
  const mk=(rl,dn)=>{const o=[];let cur=ch0[0]+7;
    for(let s=0;s<64;){
      const c=ch0[s>>4],st=s%4==0;
      if(rl()>dn*(st?1.3:.6)){s++;continue;}
      if(st&&rl()<.6)cur=tones(c).reduce((a,x)=>Math.abs(x-cur)<Math.abs(a-cur)?x:a);else cur+=pick(rl,[-2,-1,-1,0,1,1,2]);
      cur=cl(cur);const l=pick(rl,[1,2,2,3,4]);o.push({s,d:cur,l});s+=l;}
    return o;};
  const mut=(rl,P)=>P.map(x=>rl()<.4?{...x,d:cl(x.d+pick(rl,[-2,-1,1,2]))}:x);
  const ply=(pat,fn)=>{for(let g=0;g*4<bars;g++)for(const x of pat[g%4]){const s=g*64+x.s;if(s<steps)fn(x,s);}};
  const dens=v('dens'),[lw,ld]=LW[v('lead')];
  const rl=R('l'),P1=mk(rl,dens),P2=mut(rl,P1),pat=[P1,P1,P2,P1],rx=R('x');
  ply(pat,(x,s)=>note(b,T(s),D(s,x.l*.9),mf(root+12+deg(x.d)+pj(rx)),lw,.2,{du:ld,dec:.6}));
  if(nvc>=2)bass(b,R,bars,T,D,mf,root,deg,chordOf,pv);
  if(nvc>=3)drums(b,R,bars,nvc,T);
  if(nvc>=4){
    const ra=R('a'),ax=R('z'),st=pick(ra,[[0,1,2,3],[0,1,2,3,2,1],[0,2,1,3]]);
    for(let s=0;s<steps;s++){
      const c=chordOf(s>>4),t=[c,c+2,c+4,c+7];
      if(ra()<.9)note(b,T(s),D(s,.9),mf(root+12+deg(t[st[s%st.length]])+pj(ax)),0,.07,{du:.125,dec:1.5});
    }
  }
  if(nvc>=6){const rh=R('h');ply(pat,(x,s)=>note(b,T(s),D(s,x.l*.9),mf(root+12+deg(x.d+2)+pj(rh)),0,.08,{du:.125,dec:.6}));}
  if(nvc>=7)for(let bar=0;bar<bars;bar++)for(const k of[0,2,4])note(b,bs[bar],sdb[bar]*16*1.02,mf(root+deg(chordOf(bar)+k)),2,.1,{at:.2,dec:.3});
  if(nvc>=8){const rc=R('c'),rcx=R('k'),C=mk(rc,dens*.7),pc=[C,mut(rc,C),C,mut(rc,C)];ply(pc,(x,s)=>note(b,T(s),D(s,x.l*.7),mf(root+24+deg(x.d)+pj(rcx)),0,.07,{du:.125,dec:1}));}
  if(nvc>=9)stabs(b,R,bars,T,D,mf,root,deg,chordOf);
  let pkv=0;for(let i=0;i<b.length;i++)pkv=Math.max(pkv,Math.abs(b[i]));
  if(pkv>.85){const g=.85/pkv;for(let i=0;i<b.length;i++)b[i]*=g;}
  A.el('minfo').textContent=`${bpm} bpm, ${KEYS[((key+v('mpitch'))%12+12)%12]} ${SN[si].toLowerCase()}, ${(b.length/MS).toFixed(1)} s`;
  return b;
}
function bass(b,R,bars,T,D,mf,root,deg,chordOf,pv){
  const rb=R('b'),rbx=R('y'),pats=[[0,4,8,12],[0,3,6,8,11,14],[0,2,4,6,8,10,12,14],[0,6,8,14]];
  let bp=pick(rb,pats);
  for(let bar=0;bar<bars;bar++){
    if(bar%4==0)bp=pick(rb,pats);
    for(const s of bp){
      const q=bar*16+s;
      note(b,T(q),D(q,bp.length>5?1.8:3),mf(root-12+deg(chordOf(bar))+(rb()<.15?12:0)+(pv>.4&&rbx()<pv*.3?pick(rbx,[-12,12,7,-5]):0)),2,.35,{dec:.8});
    }
  }
}
function drums(b,R,bars,nvc,T){
  const rd=R('d');
  for(let bar=0;bar<bars;bar++){
    const fill=bars>=4&&bar%4==3;
    for(let s=0;s<16;s++){
      const q=bar*16+s,t=T(q);
      if(s==0||s==8||(s==10&&rd()<.3))note(b,t,.16,150,3,.55,{sl:.25,dec:1.2});
      if((!fill&&(s==4||s==12))||(fill&&s>=12)){note(b,t,.13,9000,4,.22,{dec:1.5});note(b,t,.08,190,2,.15,{dec:2});}
      if(nvc>=5)note(b,t,.04,14000,4,s%2?.025:.05,{dec:2});
      if(nvc>=10){
        if(s==6||s==14)note(b,t,.14,13000,4,.045,{dec:1.2});
        if(bar%8==0&&s==0)note(b,t,.7,12000,4,.07,{dec:1.5});
        if(fill&&s>=8&&s<12)note(b,t,.12,120-(s-8)*14,3,.3,{sl:.5,dec:1.2});
      }
    }
  }
}
function stabs(b,R,bars,T,D,mf,root,deg,chordOf){
  const rs=R('s'),stp=pick(rs,[[0,6,10],[2,6,10,14],[0,3,6,9,12],[4,12]]);
  for(let bar=0;bar<bars;bar++)for(const s of stp)for(const k of[0,2,4]){
    const q=bar*16+s;note(b,T(q),D(q,1.2),mf(root+12+deg(chordOf(bar)+k)),0,.04,{du:.25,dec:1.5});
  }
}
A.musSize=()=>{
  const d=A.mus.data;if(!d)return;
  const[sr,bits]=A.QUAL[v('q')];
  A.el('msave').textContent=`Download WAV, ${kb(44+Math.floor(d.length*sr/MS)*bits/8)}`;
};
A.musStop=()=>{try{A.mus.src&&A.mus.src.s.stop();}catch(e){}A.mus.src=null;A.el('mplay').textContent='Play loop';};
A.musStart=()=>{A.musStop();A.mus.src=A.play(A.mus.data,MS,true,v('mvol'));A.el('mplay').textContent='Stop';};
A.musGo=go=>{
  const was=A.mus.src;A.el('minfo').textContent='Rendering...';
  setTimeout(()=>{A.mus.data=music();A.draw(A.el('mw'),A.mus.data);A.musSize();if(was||go)A.musStart();},15);
};
A.musSave=()=>{const[sr,bits]=A.QUAL[v('q')];A.save(A.mus.data,[MS,sr],bits,'seedblip-loop-'+baseOf('mseed'));};
})(AUDIO);
