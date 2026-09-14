import { runtimeEnv } from '../shared';
export function GET(){return Response.json({ready:Boolean(runtimeEnv.OPENAI_API_KEY)},{headers:{'Cache-Control':'no-store'}});}
