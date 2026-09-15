import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),base:'/Article-test/',publicDir:false,plugins:[react()],resolve:{alias:[{find:/.*\/SpeakButton$/,replacement:fileURLToPath(new URL('Speak.tsx',import.meta.url))}]},build:{outDir:'../docs',emptyOutDir:true}});
