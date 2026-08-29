import type { Context } from 'hono'
import { satusehatConfig } from './config'
import { satusehatAccessToken } from './satusehat-auth'

export type RmeLinkKind='chl'|'shl'
export type RmeViewerInput={
  patient_id:string
  patient_name:string
  practitioner_id:string
  practitioner_name:string
  organization_id:string
  organization_name:string
}

export function extractRmeUrl(kind:RmeLinkKind,response:any){
  const key=kind==='chl'?'verificationUrl':'shlinkUrl'
  const url=response?.data?.[key]
  return typeof url==='string'?url:undefined
}

function safeJson(text:string){
  try{return text?JSON.parse(text):null}catch{return {success:false,message:text}}
}

export async function rmeLink(c:Context,kind:RmeLinkKind,input:RmeViewerInput){
  const cfg=satusehatConfig(c)
  const access=await satusehatAccessToken(c)
  const path=`/${kind}`
  const started=Date.now()
  const res=await fetch(`${cfg.rmeUrl.replace(/\/$/,'')}${path}`,{method:'POST',headers:{Authorization:`Bearer ${access}`,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(input)})
  const response=safeJson(await res.text())
  return {ok:res.ok,status:res.status,method:'POST',path,elapsedMs:Date.now()-started,request:input,response,service:'RME Viewer',baseEnvVar:'$SATUSEHAT_RME_URL',url:extractRmeUrl(kind,response)}
}
