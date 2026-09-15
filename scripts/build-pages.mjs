import {build} from 'vite';
import {cp,mkdir,writeFile} from 'node:fs/promises';
await build({configFile:'pages/vite.config.ts'});
await mkdir('docs/audio',{recursive:true});
await cp('public/audio','docs/audio',{recursive:true});
for(const file of ['lion-cover.png','jellyfish-cover.png','favicon.svg'])await cp('public/'+file,'docs/'+file);
await writeFile('docs/.nojekyll','');
