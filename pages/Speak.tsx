import {useEffect,useRef,useState} from 'react';
import {Volume2,Square} from 'lucide-react';
export default function Speak({text,label='我幫你讀',sample=false}:{text:string;label?:string;sample?:boolean;apiKey?:string}){
 const [playing,setPlaying]=useState(false);const ref=useRef<HTMLAudioElement|null>(null);
 useEffect(()=>()=>{ref.current?.pause();speechSynthesis.cancel();},[]);
 function fallback(){if(!('speechSynthesis' in window)){setPlaying(false);return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='zh-TW';u.rate=.85;u.onend=u.onerror=()=>setPlaying(false);speechSynthesis.speak(u);}
 function play(){if(playing){ref.current?.pause();speechSynthesis.cancel();setPlaying(false);return;}setPlaying(true);let hash=0x811c9dc5;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193);}if(sample){const a=new Audio(import.meta.env.BASE_URL+'audio/'+(hash>>>0).toString(16).padStart(8,'0')+'.wav');ref.current=a;a.onended=()=>setPlaying(false);a.onerror=fallback;a.play().catch(fallback);}else fallback();}
 return <button className="speak-button" type="button" title={label} aria-label={playing?'停止朗讀':label} aria-pressed={playing} onClick={play}>{playing?<Square size={17}/>:<Volume2 size={17}/>}</button>;
}
