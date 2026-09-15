import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../chatgpt-auth';
import { z } from 'zod';
export const runtimeEnv=env as unknown as {BUCKET?:R2Bucket;OPENAI_API_KEY?:string;OPENAI_MODEL?:string};
export async function userPrefix(){const user=await getChatGPTUser();if(!user)throw new Error('AUTH');return 'users/'+encodeURIComponent(user.userId)+'/';}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
const words=z.object({text:z.string().max(1200),zhuyin:z.array(z.string().max(20)).max(1200)}).strict();
export const sheetSchema=z.object({id:z.string().uuid().optional(),sample:z.boolean().optional(),builtinId:z.enum(['lion','jellyfish']).optional(),cover:z.string().regex(/^(\/(lion|jellyfish)-cover\.png|\/api\/cover\?id=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/).optional(),coverBrief:z.string().max(1200).optional(),title:z.string().min(1).max(200),source:z.string().min(1).max(200),level:z.string().max(40),difficulty:z.string().max(20),tags:z.array(z.string().max(40)).min(1).max(5),article:z.string().max(40000),adapted:words,questions:z.array(z.object({prompt:words,options:z.array(words).min(2).max(4),answer:z.number().int().min(0).max(3),explanation:words}).strict().refine(q=>q.answer<q.options.length)).length(5),mindTitle:words,mindInstruction:words,mind:z.array(z.object({label:words,prompt:words,answer:words}).strict()).min(3).max(6),open:z.array(z.object({prompt:words,guide:words}).strict()).length(2)}).strict();
export function fail(error:unknown){if((error as Error).message==='AUTH')return Response.json({error:'請先登入後使用。'},{status:401});console.error('Reading service failure',error instanceof Error?error.name:'unknown');return Response.json({error:'服務暫時無法使用，請稍後重試。輸入內容已保留。'},{status:503});}

