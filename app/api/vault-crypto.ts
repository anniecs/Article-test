import { runtimeEnv } from './shared';
import type {Original} from '../vault-types';
type Envelope={iv:string;data:string};
type Config={salt:string;verifier:Envelope};
const bytes=(s:string)=>Uint8Array.from(Buffer.from(s,'base64'));
const base64=(b:ArrayBuffer|Uint8Array)=>Buffer.from(b instanceof Uint8Array?b:new Uint8Array(b)).toString('base64');
export async function derive(password:string,salt:string){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(salt),iterations:100000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function encrypt(key:CryptoKey,value:unknown):Promise<Envelope>{const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value)));return {iv:base64(iv),data:base64(data)};}
export async function decrypt<T>(key:CryptoKey,value:Envelope):Promise<T>{const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(value.iv)},key,bytes(value.data));return JSON.parse(new TextDecoder().decode(plain));}
export async function makeConfig(password:string){const salt=base64(crypto.getRandomValues(new Uint8Array(16)));const key=await derive(password,salt);return {key,config:{salt,verifier:await encrypt(key,'reading-vault-v1')}};}
export async function unlock(prefix:string,password:string){if(!password)throw Error('LOCKED');const stored=await runtimeEnv.BUCKET?.get(prefix+'vault/config.json');if(!stored)throw Error('NOT_INITIALIZED');const config=await stored.json<Config>();try{const key=await derive(password,config.salt);if(await decrypt(key,config.verifier)!=='reading-vault-v1')throw Error();return key;}catch{throw Error('LOCKED');}}
export async function saveOriginal(prefix:string,key:CryptoKey,original:Original,id:string){if(!runtimeEnv.BUCKET)throw Error('STORAGE');await runtimeEnv.BUCKET.put(prefix+'vault/entries/'+id+'.json',JSON.stringify(await encrypt(key,original)),{httpMetadata:{contentType:'application/json'},customMetadata:{title:original.title,source:original.source,id:original.id}});}
export function vaultError(e:unknown){const m=(e as Error).message;return ['LOCKED','NOT_INITIALIZED'].includes(m)?Response.json({error:m==='LOCKED'?'密碼不正確，或原文區尚未解鎖。':'請先設定原文區密碼。'},{status:403}):null;}
