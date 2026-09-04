import type { Context } from 'hono'
import { satusehatConfig } from './config'
import { satusehatAccessToken } from './satusehat-auth'

export type RmeLinkKind='chl'|'chl-emergency'|'shl'
export type RmeViewerInput={
  patient_id:string
  patient_name:string
  practitioner_id:string
  practitioner_name:string
  organization_id:string
  organization_name:string
}
export type RmeLinkRequestPayload=RmeViewerInput&{type_medical_summary?:'EMERGENCY'}

export function extractRmeUrl(kind:RmeLinkKind,response:any){
  const key=kind==='shl'?'shlinkUrl':'verificationUrl'
  const url=response?.data?.[key]
  return typeof url==='string'?url:undefined
}

export function rmeEndpointPath(kind:RmeLinkKind){
  return kind==='shl'?'/shl':'/chl'
}

export function rmeRequestPayload(kind:RmeLinkKind,input:RmeViewerInput):RmeLinkRequestPayload{
  return kind==='chl-emergency'?{...input,type_medical_summary:'EMERGENCY'}:input
}

function safeJson(text:string){
  try{return text?JSON.parse(text):null}catch{return {success:false,message:text}}
}

export async function rmeLink(c:Context,kind:RmeLinkKind,input:RmeViewerInput){
  const cfg=satusehatConfig(c)
  const access=await satusehatAccessToken(c)
  const path=rmeEndpointPath(kind)
  const request=rmeRequestPayload(kind,input)
  const started=Date.now()
  const res=await fetch(`${cfg.rmeUrl.replace(/\/$/,'')}${path}`,{method:'POST',headers:{Authorization:`Bearer ${access}`,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(request)})
  const response=safeJson(await res.text())
  return {ok:res.ok,status:res.status,method:'POST',path,elapsedMs:Date.now()-started,request,response,service:'RME Viewer',baseEnvVar:'$SATUSEHAT_RME_URL',url:extractRmeUrl(kind,response)}
}
