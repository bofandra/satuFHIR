import type { Context } from 'hono'
import { bool, env, satusehatConfig } from './config'

type CachedToken={cacheKey:string;token:string;expiresAt:number}
let cache:CachedToken|null=null

export function clearSatusehatAccessToken(){
  cache=null
}

export async function satusehatAccessToken(c:Context){
  const cfg=satusehatConfig(c)
  const e=env(c)
  if(cfg.environment==='production'&&!bool(e.ALLOW_PRODUCTION,false))throw new Error('Production access is disabled. Set ALLOW_PRODUCTION=true only after an explicit safety review.')
  if(!cfg.clientId||!cfg.clientSecret)throw new Error('SATUSEHAT_CLIENT_ID and SATUSEHAT_CLIENT_SECRET are required')
  const cacheKey=`${cfg.authUrl}:${cfg.clientId}`
  if(cache&&cache.cacheKey===cacheKey&&cache.expiresAt>Date.now()+30000)return cache.token
  const body=new URLSearchParams({client_id:cfg.clientId,client_secret:cfg.clientSecret})
  const res=await fetch(`${cfg.authUrl.replace(/\/$/,'')}/accesstoken?grant_type=client_credentials`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body})
  const data=await res.json() as any
  if(!res.ok||!data.access_token)throw new Error(`SATUSEHAT OAuth failed (${res.status})`)
  cache={cacheKey,token:data.access_token,expiresAt:Date.now()+Number(data.expires_in||300)*1000}
  return cache.token
}
