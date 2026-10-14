import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Home, Film, FlaskConical, Download, ArrowLeft, Play, Pause, Sparkles, SlidersHorizontal, Volume2, VolumeX, LoaderCircle, Check, Settings2} from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import './style.css';

const defaults={ratio:'9:16',highlight:true,chromatic:false,bgType:'Static',bgStyle:'Simple',blurType:'Vertical',blur:'Medium',x:50,y:48,zoom:100,audio:true,volume:45};
function App(){
 const [settings,setSettings]=useState(defaults),[text,setText]=useState('RUMUS 3 LANGKAH KAYA\\nFOKUS PADA HAL YANG PENTING\\nBANGUN KEBIASAAN BARU'),[page,setPage]=useState('editor'),[videoUrl,setVideoUrl]=useState(''),[videoExt,setVideoExt]=useState('mp4'),[busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[playing,setPlaying]=useState(false);
 const videoRef=useRef(null), canvasRef=useRef(null), ffmpegRef=useRef(null);
 const update=(k,v)=>setSettings(s=>({...s,[k]:v}));
 const ratio= settings.ratio==='9:16' ? [720,1280] : settings.ratio==='16:9' ? [1280,720] : settings.ratio==='1:1' ? [900,900] : settings.ratio==='4:5' ? [800,1000] : [720,1280];
 useEffect(()=>{if(page==='editor') drawPreview(canvasRef.current,text,settings,ratio);},[page,text,settings]);
 useEffect(()=>()=>{if(videoUrl)URL.revokeObjectURL(videoUrl)},[videoUrl]);
 async function generate(){
  setError(''); if(!text.trim()){setError('Masukkan teks terlebih dahulu.');return}
  setBusy(true);setProgress('Menyiapkan animasi…');
  try{
   const canvas=document.createElement('canvas');canvas.width=ratio[0];canvas.height=ratio[1];
   const ctx=canvas.getContext('2d'); const stream=canvas.captureStream(30);
   let audioCtx, audioDest;
   if(settings.audio && settings.volume>0){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)(); await audioCtx.resume();
    audioDest=audioCtx.createMediaStreamDestination(); stream.addTrack(audioDest.stream.getAudioTracks()[0]);
   }
   const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'].find(t=>MediaRecorder.isTypeSupported(t))||'';
   const rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:6500000}:undefined);const chunks=[];
   rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   const stopped=new Promise((resolve,reject)=>{rec.onstop=resolve;rec.onerror=()=>reject(new Error('Perekaman gagal. Coba browser Chrome/Edge terbaru.'))});
   const lines=text.split(/\n|(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
   const start=performance.now(), duration=Math.min( Math.max(lines.length*0.72,4), Math.max(4,Math.min(45,lines.length*0.72)));
   const totalMs=duration*1000;
   function sfx(at){
    if(!audioCtx||!audioDest)return;
    const t=audioCtx.currentTime; const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(720,t);osc.frequency.exponentialRampToValueAtTime(190,t+0.11);
    gain.gain.setValueAtTime((settings.volume/100)*0.13,t);gain.gain.exponentialRampToValueAtTime(0.001,t+0.14);
    osc.connect(gain);gain.connect(audioDest);osc.start(t);osc.stop(t+0.15);
   }
   rec.start(100);
   await new Promise(resolve=>{
    function frame(now){
     const elapsed=now-start, p=Math.min(elapsed/totalMs,1);
     const idx=Math.min(lines.length-1,Math.floor(p*lines.length));
     const local=(p*lines.length)%1;
     drawFrame(ctx,canvas.width,canvas.height,lines[idx]||'',settings,p,local,idx);
     if(idx>0 && local<0.04 && Math.abs(local-0.02)<0.018)sfx(idx);
     setProgress(`Merender video… ${Math.round(p*100)}%`);
     if(p<1)requestAnimationFrame(frame);else resolve();
    } requestAnimationFrame(frame);
   });
   rec.stop(); await stopped; stream.getTracks().forEach(t=>t.stop());if(audioCtx)await audioCtx.close();
   setProgress('Menyiapkan file MP4…');
   let blob=new Blob(chunks,{type:rec.mimeType||'video/webm'}); let ext=blob.type.includes('mp4')?'mp4':'webm';
   if(ext!=='mp4'){
    try{
     if(!ffmpegRef.current) {
      const ff=new FFmpeg(); ff.on('progress',({progress})=>setProgress(`Konversi MP4… ${Math.round(progress*100)}%`));
      await ff.load({coreURL:await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js','text/javascript'),wasmURL:await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm','application/wasm')});
      ffmpegRef.current=ff;
     }
     const ff=ffmpegRef.current, input='source.webm';await ff.writeFile(input,new Uint8Array(await blob.arrayBuffer()));
     await ff.exec(['-i',input,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-c:a','aac','-b:a','128k','matchcut.mp4']);
     blob=new Blob([await ff.readFile('matchcut.mp4')],{type:'video/mp4'});ext='mp4';
    }catch(e){console.warn(e);setProgress('Konversi MP4 tidak tersedia; video disiapkan dalam WebM.');}
   }
   const url=URL.createObjectURL(blob);setVideoExt(ext);setVideoUrl(url);setPage('preview');setPlaying(false);
  }catch(e){setError(e?.message||'Terjadi kesalahan saat membuat video.');}
  finally{setBusy(false);setProgress('');}
 }
 function download(){if(!videoUrl)return;const a=document.createElement('a');a.href=videoUrl;a.download='text-match-cut.'+videoExt;a.click()}
 function back(){setPage('editor');setPlaying(false)}
 return <div className="app">
  <aside className="rail"><div className="brand"><Film size={20}/></div><button title="Beranda"><Home size={19}/></button><button className="active" title="Match cut"><Film size={19}/></button><button title="Eksperimen"><FlaskConical size={19}/></button><div className="railBottom">MC</div></aside>
  <main className="main">
   <header className="topbar"><div><div className="eyebrow">CREATIVE TOOLS / VIDEO</div><h1>MatchCut <span>Studio</span></h1></div><div className="topright"><span className="statusDot"></span> Local rendering <span className="version">BETA</span></div></header>
   {page==='editor'?<div className="workspace">
    <section className="editorPanel">
     <div className="sectionHead"><div><h2>Create text match cut</h2><p>Turn your words into fast-paced typography motion.</p></div><span className="step">01 / 02</span></div>
     <label className="fieldLabel" htmlFor="copy">TEXT CONTENT <span>Separate phrases with a new line</span></label>
     <textarea id="copy" value={text} onChange={e=>setText(e.target.value)} placeholder="Ketik atau tempel teks di sini…"/>
     <div className="miniInfo"><span>{text.trim()?text.trim().split(/\s+/).length:0} words</span><span>{text.split(/\n|(?<=[.!?])\s+/).filter(x=>x.trim()).length} text beats</span><span>No app word cap</span></div>
     <div className="sectionDivider"></div>
     <div className="settingsTitle"><SlidersHorizontal size={16}/><h3>Customize</h3></div>
     <div className="field"><label>ASPECT RATIO</label><div className="segmented">{['9:16','16:9','1:1','4:5'].map(v=><button className={settings.ratio===v?'selected':''} onClick={()=>update('ratio',v)} key={v}>{v}</button>)}</div></div>
     <div className="toggleRow"><div><b>Text highlight</b><small>Highlight selected words in yellow</small></div><button className={'switch '+(settings.highlight?'on':'')} onClick={()=>update('highlight',!settings.highlight)} aria-label="Toggle text highlight"><i/></button></div>
     <div className="toggleRow"><div><b>Chromatic aberration</b><small>Subtle RGB split on transitions</small></div><button className={'switch '+(settings.chromatic?'on':'')} onClick={()=>update('chromatic',!settings.chromatic)} aria-label="Toggle chromatic aberration"><i/></button></div>
     <div className="field"><label>BACKGROUND TYPE</label><div className="segmented"><button className={settings.bgType==='Static'?'selected':''} onClick={()=>update('bgType','Static')}>Static</button><button className={settings.bgType==='Dynamic'?'selected':''} onClick={()=>update('bgType','Dynamic')}>Dynamic</button></div></div>
     <div className="field"><label>BACKGROUND STYLE</label><div className="segmented"><button className={settings.bgStyle==='Simple'?'selected':''} onClick={()=>update('bgStyle','Simple')}>Simple</button><button className={settings.bgStyle==='Newspaper'?'selected':''} onClick={()=>update('bgStyle','Newspaper')}>Newspaper</button></div></div>
     <div className="field"><label>BLUR TYPE</label><div className="segmented"><button className={settings.blurType==='Vertical'?'selected':''} onClick={()=>update('blurType','Vertical')}>Vertical</button><button className={settings.blurType==='Radial'?'selected':''} onClick={()=>update('blurType','Radial')}>Radial</button></div></div>
     <div className="field"><label>BLUR INTENSITY</label><div className="segmented three">{['Low','Medium','High'].map(v=><button className={settings.blur===v?'selected':''} onClick={()=>update('blur',v)} key={v}>{v}</button>)}</div></div>
     <div className="sectionDivider"></div>
     <div className="settingsTitle"><Settings2 size={16}/><h3>Text position</h3></div>
     <Slider label="Position X" value={settings.x} min={0} max={100} onChange={v=>update('x',v)} suffix="%"/>
     <Slider label="Position Y" value={settings.y} min={0} max={100} onChange={v=>update('y',v)} suffix="%"/>
     <Slider label="Zoom" value={settings.zoom} min={50} max={160} onChange={v=>update('zoom',v)} suffix="%"/>
     <div className="sectionDivider"></div>
     <div className="toggleRow"><div><b>Transition sound effects</b><small>Soft snap / whoosh on each text beat</small></div><button className={'switch '+(settings.audio?'on':'')} onClick={()=>update('audio',!settings.audio)} aria-label="Toggle audio"><i/></button></div>
     {settings.audio&&<Slider label="Audio volume" value={settings.volume} min={0} max={100} onChange={v=>update('volume',v)} suffix="%"/>}
     {error&&<div className="error">{error}</div>}
     <button className="generate" onClick={generate} disabled={busy}>{busy?<><LoaderCircle className="spin" size={18}/>{progress||'Generating…'}</>:<><Sparkles size={18}/> Generate Text Match Cut <span>↗</span></>}</button>
     <p className="footnote">Rendered in your browser · No AI credits required</p>
    </section>
    <section className="previewPanel">
     <div className="previewTop"><div><h2>Live preview</h2><p>Changes appear as you edit</p></div><span className="liveBadge"><i/> LIVE</span></div>
     <div className="canvasArea"><div className="previewFrame" style={{aspectRatio:settings.ratio.replace(':',' / ')}}><canvas ref={canvasRef}/><div className="frameCorners"></div></div></div>
     <div className="previewMeta"><span><b>{settings.ratio}</b> Aspect ratio</span><span><b>30 FPS</b> Export target</span><span><b>MP4</b> Output</span></div>
     <div className="tip"><Sparkles size={17}/><div><b>Tip for stronger match cuts</b><p>Use short phrases on separate lines. Each line becomes a new visual beat, with a quick scale transition between compositions.</p></div></div>
    </section>
   </div>:<div className="resultPage">
    <div className="sectionHead"><div><h2>Your video is ready</h2><p>Preview the result before exporting.</p></div><span className="step">02 / 02</span></div>
    <div className="resultGrid"><div className="playerCard"><div className="playerStage"><video ref={videoRef} src={videoUrl} controls playsInline onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} /></div><div className="playerFooter"><span>{playing?'Playing preview':'Preview ready'}</span><span><Check size={14}/> Render complete</span></div></div>
    <aside className="exportCard"><div className="exportIcon"><Film size={23}/></div><h3>Text Match Cut</h3><p>Generated from your current editor settings.</p><div className="exportStats"><div><span>Aspect ratio</span><b>{settings.ratio}</b></div><div><span>Frame rate</span><b>30 FPS</b></div><div><span>Text beats</span><b>{text.split(/\n|(?<=[.!?])\s+/).filter(x=>x.trim()).length}</b></div></div><button className="generate" onClick={download}><Download size={18}/> Download video</button><button className="secondary" onClick={back}><ArrowLeft size={17}/> Back to editor</button><p className="footnote">Your text and settings remain available when you return.</p></aside></div>
   </div>}
   <footer className="footer"><span>© MatchCut Studio</span><span>Built for creators <span className="footerDot">•</span> Browser-based rendering</span></footer>
  </main>
 </div>
}
function Slider({label,value,min,max,onChange,suffix}){return <div className="sliderField"><div className="sliderHead"><label>{label}</label><span>{value}{suffix}</span></div><input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}/></div>}
function drawPreview(canvas,text,s,ratio){if(!canvas)return;const w=canvas.clientWidth||360,h=canvas.clientHeight||640;canvas.width=Math.max(2,w*2);canvas.height=Math.max(2,h*2);drawFrame(canvas.getContext('2d'),canvas.width,canvas.height,text.split(/\n|(?<=[.!?])\s+/).filter(Boolean)[0]||'YOUR TEXT HERE',s,0,0,0)}
function drawFrame(ctx,w,h,text,s,p,local,idx){
 ctx.save();ctx.clearRect(0,0,w,h);
 const blur=s.blur==='Low'?2:s.blur==='Medium'?6:12;
 const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#d8d4c8');g.addColorStop(.5,'#aaa79d');g.addColorStop(1,'#e8e4da');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 if(s.bgStyle==='Newspaper'){
  ctx.save();ctx.filter=`blur(${blur}px)`;ctx.globalAlpha=.9;ctx.fillStyle='#f5f2e9';ctx.fillRect(-w*.1,-h*.1,w*1.2,h*1.2);
  for(let y=-h*.05;y<h*1.1;y+=h*.055){ctx.fillStyle='#77756e';ctx.fillRect(w*.04,y,w*.92,h*.004);for(let x=w*.04;x<w*.95;x+=w*.18){ctx.fillStyle='#292925';ctx.font=`900 ${Math.max(8,w*.035)}px Georgia`;ctx.fillText('DAILY NEWS',x,y+h*.022);for(let j=0;j<4;j++){ctx.fillStyle='#77756e';ctx.fillRect(x,y+h*.028+j*h*.006,w*.13,h*.002)}}}
  ctx.fillStyle='#222';ctx.font=`900 ${w*.12}px Georgia`;ctx.fillText('THE',w*.08,h*.28);ctx.fillText('DAILY',w*.08,h*.39);ctx.fillText('PAPER',w*.08,h*.5);ctx.restore();
 }else{
  ctx.save();ctx.filter=`blur(${blur}px)`;ctx.fillStyle='#171719';for(let i=0;i<22;i++){ctx.fillRect(Math.sin(i*8)*w*.4+w*.3,i*h/20,w*.7,h*.008)}ctx.restore();
 }
 if(s.bgType==='Dynamic'){ctx.fillStyle=`rgba(255,255,255,${.06+Math.abs(Math.sin(p*18))*.08})`;ctx.fillRect(0,0,w,h)}
 if(s.blurType==='Vertical'){ctx.save();const grd=ctx.createLinearGradient(0,0,w,0);grd.addColorStop(0,'rgba(15,15,15,.36)');grd.addColorStop(.2,'rgba(15,15,15,.05)');grd.addColorStop(.8,'rgba(15,15,15,.05)');grd.addColorStop(1,'rgba(15,15,15,.36)');ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);ctx.restore()}
 else{const r=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.1,w/2,h/2,Math.max(w,h)*.7);r.addColorStop(0,'rgba(0,0,0,0)');r.addColorStop(1,'rgba(0,0,0,.42)');ctx.fillStyle=r;ctx.fillRect(0,0,w,h)}
 ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(0,0,w,h);
 const scale=(s.zoom/100)*(1+Math.sin(local*Math.PI)*.12), cx=w*s.x/100, cy=h*s.y/100;
 ctx.translate(cx,cy);ctx.scale(scale,scale);ctx.textAlign='center';ctx.textBaseline='middle';
 const words=text.toUpperCase().split(/\s+/).filter(Boolean);let fontSize=Math.min(w*.16,h*.12);let lines=[];
 function wrapAt(size){ctx.font=`1000 ${size}px Impact, "Arial Narrow", sans-serif`;const out=[];let line='';for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>w*.84&&line){out.push(line);line=word}else line=test}if(line)out.push(line);return out}
 lines=wrapAt(fontSize);while((lines.length*fontSize*1.02>h*.72||lines.some(line=>ctx.measureText(line).width>w*.88))&&fontSize>w*.025){fontSize*=.9;lines=wrapAt(fontSize)}
 const lineH=fontSize*1.02,startY=-(lines.length-1)*lineH/2;
 lines.forEach((word,i)=>{const y=startY+i*lineH;ctx.lineWidth=fontSize*.06;ctx.strokeStyle='#111';ctx.strokeText(word,0,y);if(s.chromatic){ctx.fillStyle='rgba(255,0,75,.75)';ctx.fillText(word,-fontSize*.035,y);ctx.fillStyle='rgba(0,220,255,.75)';ctx.fillText(word,fontSize*.035,y)}if(s.highlight&&i===Math.min(Math.floor(local*lines.length),lines.length-1)){const m=ctx.measureText(word).width;ctx.fillStyle='#f4df34';ctx.fillRect(-m/2-fontSize*.07,y-fontSize*.43,m+fontSize*.14,fontSize*.86);ctx.fillStyle='#111';ctx.fillText(word,0,y)}else{ctx.fillStyle='#fff';ctx.fillText(word,0,y)}});
 ctx.restore();
}
createRoot(document.getElementById('root')).render(<App/>);
