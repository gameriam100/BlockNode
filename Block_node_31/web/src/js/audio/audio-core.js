// AUDIO CORE — shared helpers for the Audio tab: seeded RNG, waveforms, playback, WAV export.
const AUDIO={SR:22050,OS:4,MS:32000,ready:false,pending:null,sfx:{data:null,src:null},mus:{data:null,src:null},ac:null};
AUDIO.el=id=>document.getElementById('au-'+id);
AUDIO.v=id=>+AUDIO.el(id).value;
AUDIO.pick=(r,a)=>a[r()*a.length|0];
AUDIO.sgn=x=>(x>0?'+':'')+x;
AUDIO.rand=()=>Math.random().toString(36).slice(2,7);
AUDIO.kb=b=>b<10240?(b/1024).toFixed(1)+' KB':b<1048576?Math.round(b/1024)+' KB':(b/1048576).toFixed(2)+' MB';
AUDIO.baseOf=id=>AUDIO.el(id).value.split('~')[0].trim()||'x';
AUDIO.hash=s=>{
  let h=1779033703^s.length;
  for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);
  return(h^h>>>16)>>>0;
};
AUDIO.rngOf=s=>{
  let a=AUDIO.hash(String(s));
  return()=>{a=a+1831565813|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
};
// 0 square, 1 saw, 2 triangle, 3 sine, 4 noise
AUDIO.W=(w,p,d,n)=>w==0?(p<d?1:-1):w==1?2*p-1:w==2?4*Math.abs(p-.5)-1:w==3?Math.sin(6.2832*p):n;
AUDIO.draw=(cv,d)=>{
  const c=cv.getContext('2d'),W=cv.width,H=cv.height,k=Math.ceil(d.length/W);
  c.clearRect(0,0,W,H);
  c.fillStyle=getComputedStyle(cv.closest('.au-card')).getPropertyValue('--c')||'#3ec6b0';
  for(let x=0;x<W;x++){
    let p=0;
    for(let i=x*k,e=Math.min(d.length,i+k);i<e;i++){const a=Math.abs(d[i]);if(a>p)p=a;}
    const h=Math.round(Math.min(1,p)*H/2);
    c.fillRect(x,H/2-h,1,Math.max(1,h*2));
  }
};
AUDIO.play=(d,sr,loop,vol)=>{
  AUDIO.ac=AUDIO.ac||new(window.AudioContext||window.webkitAudioContext)();
  AUDIO.ac.resume();
  const b=AUDIO.ac.createBuffer(1,d.length,sr);b.copyToChannel(d,0);
  const s=AUDIO.ac.createBufferSource(),g=AUDIO.ac.createGain();
  s.buffer=b;s.loop=loop;g.gain.value=vol;
  s.connect(g).connect(AUDIO.ac.destination);s.start();
  return{s,g};
};
AUDIO.resample=(d,from,to)=>{
  if(from==to)return d;
  const r=from/to,n=Math.floor(d.length/r),o=new Float32Array(n);
  for(let i=0;i<n;i++){
    const a=Math.floor(i*r),e=Math.max(a+1,Math.floor((i+1)*r));
    let s=0;for(let j=a;j<e;j++)s+=d[j];
    o[i]=s/(e-a);
  }
  return o;
};
AUDIO.wav=(d,sr,bits)=>{
  const n=d.length,by=bits/8,b=new DataView(new ArrayBuffer(44+n*by)),w=(o,s)=>[...s].forEach((c,i)=>b.setUint8(o+i,c.charCodeAt()));
  w(0,'RIFF');b.setUint32(4,36+n*by,true);w(8,'WAVEfmt ');b.setUint32(16,16,true);b.setUint16(20,1,true);b.setUint16(22,1,true);
  b.setUint32(24,sr,true);b.setUint32(28,sr*by,true);b.setUint16(32,by,true);b.setUint16(34,bits,true);w(36,'data');b.setUint32(40,n*by,true);
  for(let i=0;i<n;i++){
    const x=Math.max(-1,Math.min(1,d[i]));
    bits==8?b.setUint8(44+i,Math.round(x*127+128)):b.setInt16(44+i*2,x*32767,true);
  }
  return new Blob([b],{type:'audio/wav'});
};
AUDIO.save=(d,sr,bits,name)=>{
  const a=document.createElement('a');
  a.href=URL.createObjectURL(AUDIO.wav(AUDIO.resample(d,sr[0],sr[1]),sr[1],bits));
  a.download=name.replace(/[^\w-]+/g,'_')+'.wav';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
