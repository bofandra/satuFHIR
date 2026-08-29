import type { MiddlewareHandler } from 'hono'
import { deleteCookie,getCookie,setCookie } from 'hono/cookie'
import { sign,verify } from 'hono/jwt'
import { bool,env } from './config'
const enc=new TextEncoder()
function hex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function verifyPassword(password:string,encoded:string){const[alg,it,salt,expected]=encoded.split('$');if(alg!=='pbkdf2'||!it||!salt||!expected)return false;const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode(salt),iterations:Number(it)},key,256);const actual=hex(new Uint8Array(bits));if(actual.length!==expected.length)return false;let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);return diff===0}
export const requireAuth:MiddlewareHandler=async(c,next)=>{const e=env(c);if(!bool(e.APP_AUTH_ENABLED,true))return next();const secret=e.AUTH_SECRET||'';if(secret.length<32)return c.json({message:'AUTH_SECRET must be at least 32 chars'},500);const token=getCookie(c,'fhircare_session');if(!token)return c.json({message:'Unauthorized'},401);try{await verify(token,secret,'HS256');return next()}catch{return c.json({message:'Unauthorized'},401)}}
export async function createSession(c:any,username:string){const e=env(c);const secret=e.AUTH_SECRET||'';const exp=Math.floor(Date.now()/1000)+8*60*60;const token=await sign({sub:username,role:'learner',exp},secret);setCookie(c,'fhircare_session',token,{httpOnly:true,sameSite:'Lax',secure:new URL(c.req.url).protocol==='https:',path:'/',maxAge:8*60*60})}
export function clearSession(c:any){deleteCookie(c,'fhircare_session',{path:'/'})}
export async function sessionUser(c:any){const e=env(c);if(!bool(e.APP_AUTH_ENABLED,true))return'anonymous';const token=getCookie(c,'fhircare_session');if(!token)return null;try{return String((await verify(token,e.AUTH_SECRET||'','HS256')).sub||'learner')}catch{return null}}
