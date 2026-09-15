import lion from '../seed-encrypted.json';
import jellyfish from '../jellyfish-seed-encrypted.json';
import { runtimeEnv } from './shared';
import { decrypt, saveOriginal } from './vault-crypto';
import type { Original } from '../vault-types';
const seeds=[{id:'52c0274e-dcdd-441f-a6e3-f90b529ec5cd',data:lion},{id:'f591a3f4-7b18-4bc2-a9f8-9ecc6990f4e3',data:jellyfish}];
export async function ensureSeedOriginals(prefix:string,vaultKey:CryptoKey){
  const seedKey=(runtimeEnv as typeof runtimeEnv & {SEED_KEY?:string}).SEED_KEY;
  if(!seedKey||!runtimeEnv.BUCKET)throw Error('SEED');
  const bootstrapKey=await crypto.subtle.importKey('raw',Uint8Array.from(Buffer.from(seedKey,'base64')),'AES-GCM',false,['decrypt']);
  for(const seed of seeds){
    if(await runtimeEnv.BUCKET.head(prefix+'vault/entries/'+seed.id+'.json'))continue;
    const original=await decrypt<Original>(bootstrapKey,seed.data);
    await saveOriginal(prefix,vaultKey,original,original.id);
  }
}
