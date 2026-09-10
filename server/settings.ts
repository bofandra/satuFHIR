import type { Context,MiddlewareHandler } from 'hono'
import { getCookie,setCookie } from 'hono/cookie'

export type SatusehatEnvironment='sandbox'|'production'

export type SatusehatSettings={
  environment:SatusehatEnvironment
  clientId:string
  clientSecret:string
  organizationId:string
  organizationName:string
  practitionerId:string
  practitionerName:string
  locationId:string
  rmeUrl:string
}

export type SatusehatSettingsInput=Partial<Pick<SatusehatSettings,'environment'|'clientId'|'clientSecret'|'organizationId'|'organizationName'|'practitionerId'|'practitionerName'|'locationId'|'rmeUrl'>>

const COOKIE_NAME='fhircare_satusehat_settings'
const CONTEXT_KEY='satusehatSettings'
const COOKIE_MAX_AGE=60*60*24*30
const encoder=new TextEncoder()
const decoder=new TextDecoder()

export const SATUSEHAT_ENDPOINTS:Record<SatusehatEnvironment,{authUrl:string;fhirUrl:string;rmeUrl:string}>={
  sandbox:{
    authUrl:'https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1',
    fhirUrl:'https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1',
    rmeUrl:'https://api-satusehat-stg.dto.kemkes.go.id/ssrme/v2/ntl',
  },
  production:{
    authUrl:'https://api-satusehat.kemkes.go.id/oauth2/v1',
    fhirUrl:'https://api-satusehat.kemkes.go.id/fhir-r4/v1',
    rmeUrl:'https://api-satusehat.kemkes.go.id/ssrme/v2/ntl',
  },
}

export const EMPTY_SATUSEHAT_SETTINGS:SatusehatSettings={
  environment:'sandbox',
  clientId:'',
  clientSecret:'',
  organizationId:'',
  organizationName:'',
  practitionerId:'',
  practitionerName:'',
  locationId:'',
  rmeUrl:'',
}

function base64Url(bytes:Uint8Array){
  let binary=''
  for(const byte of bytes)binary+=String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}

function fromBase64Url(value:string){
  const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)
  const binary=atob(padded)
  return Uint8Array.from(binary,character=>character.charCodeAt(0))
}

function contextEnv(c:Context){
  const bound=(c.env||{}) as Record<string,string|undefined>
  const node=typeof process!=='undefined'?process.env as Record<string,string|undefined>:{}
  return {...node,...bound}
}

function settingsSecret(c:Context){
  return contextEnv(c).AUTH_SECRET||''
}

async function keyFromSecret(secret:string){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(secret))
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt'])
}

function normalizeEnvironment(value:unknown):SatusehatEnvironment{
  return value==='production'?'production':'sandbox'
}

export function normalizeSatusehatSettings(input:Partial<SatusehatSettings>):SatusehatSettings{
  return {
    environment:normalizeEnvironment(input.environment),
    clientId:String(input.clientId||'').trim(),
    clientSecret:String(input.clientSecret||'').trim(),
    organizationId:String(input.organizationId||'').trim(),
    organizationName:String(input.organizationName||'').trim(),
    practitionerId:String(input.practitionerId||'').trim(),
    practitionerName:String(input.practitionerName||'').trim(),
    locationId:String(input.locationId||'').trim(),
    rmeUrl:String(input.rmeUrl||'').trim(),
  }
}

export function mergeSatusehatSettings(current:SatusehatSettings,input:SatusehatSettingsInput):SatusehatSettings{
  const next={...current}
  if(input.environment!==undefined)next.environment=normalizeEnvironment(input.environment)
  const organizationIdChanged=input.organizationId!==undefined&&String(input.organizationId||'').trim()!==current.organizationId
  const practitionerIdChanged=input.practitionerId!==undefined&&String(input.practitionerId||'').trim()!==current.practitionerId
  for(const key of ['organizationId','organizationName','practitionerId','practitionerName','locationId','rmeUrl'] as const){
    if(input[key]!==undefined)next[key]=String(input[key]||'').trim()
  }
  if(organizationIdChanged){
    if(input.organizationName===undefined)next.organizationName=''
    if(input.locationId===undefined)next.locationId=''
  }
  if(practitionerIdChanged&&input.practitionerName===undefined)next.practitionerName=''
  if(input.clientId&&input.clientId.trim())next.clientId=input.clientId.trim()
  if(input.clientSecret&&input.clientSecret.trim())next.clientSecret=input.clientSecret.trim()
  return normalizeSatusehatSettings(next)
}

async function seal(settings:SatusehatSettings,secret:string){
  const iv=crypto.getRandomValues(new Uint8Array(12))
  const key=await keyFromSecret(secret)
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(settings)))
  return `v1.${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`
}

async function unseal(value:string,secret:string){
  const [version,ivText,cipherText]=value.split('.')
  if(version!=='v1'||!ivText||!cipherText)return EMPTY_SATUSEHAT_SETTINGS
  const key=await keyFromSecret(secret)
  const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64Url(ivText)},key,fromBase64Url(cipherText))
  return normalizeSatusehatSettings(JSON.parse(decoder.decode(decrypted)))
}

function secureCookie(c:Context){
  return new URL(c.req.url).protocol==='https:'
}

export async function readSatusehatSettingsCookie(c:Context){
  const raw=getCookie(c,COOKIE_NAME)
  const secret=settingsSecret(c)
  if(!raw||secret.length<32)return EMPTY_SATUSEHAT_SETTINGS
  try{
    return await unseal(raw,secret)
  }catch{
    return EMPTY_SATUSEHAT_SETTINGS
  }
}

export async function writeSatusehatSettingsCookie(c:Context,settings:SatusehatSettings){
  const secret=settingsSecret(c)
  if(secret.length<32)throw new Error('AUTH_SECRET must be at least 32 chars to save SATUSEHAT settings')
  const value=await seal(settings,secret)
  setCookie(c,COOKIE_NAME,value,{httpOnly:true,sameSite:'Lax',secure:secureCookie(c),path:'/',maxAge:COOKIE_MAX_AGE})
  ;(c as any).set(CONTEXT_KEY,settings)
}

export function requestSatusehatSettings(c:Context):SatusehatSettings{
  try{
    return normalizeSatusehatSettings((c as any).get(CONTEXT_KEY)||EMPTY_SATUSEHAT_SETTINGS)
  }catch{
    return EMPTY_SATUSEHAT_SETTINGS
  }
}

export const loadSatusehatSettings:MiddlewareHandler=async(c,next)=>{
  ;(c as any).set(CONTEXT_KEY,await readSatusehatSettingsCookie(c))
  await next()
}
