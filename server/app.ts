import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { bool,env,satusehatConfig } from './config'
import { clearSession,createSession,requireAuth,sessionUser,verifyPassword } from './auth'
import { fhirCreate,fhirRead,fhirSearch,fhirUpdate } from './fhir'
import { rmeLink } from './rme'
import { clearSatusehatAccessToken } from './satusehat-auth'
import { loadSatusehatSettings,mergeSatusehatSettings,requestSatusehatSettings,SATUSEHAT_ENDPOINTS,writeSatusehatSettingsCookie } from './settings'

export const app=new Hono()

const settingSchema=z.object({
  environment:z.enum(['sandbox','production']).optional(),
  clientId:z.string().optional(),
  clientSecret:z.string().optional(),
  organizationId:z.string().optional(),
  organizationName:z.string().optional(),
  practitionerId:z.string().optional(),
  practitionerName:z.string().optional(),
  locationId:z.string().optional(),
  rmeUrl:z.union([z.literal(''),z.string().url()]).optional(),
})
const rmeSchema=z.object({
  patient_id:z.string().min(1),
  patient_name:z.string().min(1),
  practitioner_id:z.string().min(1),
  practitioner_name:z.string().min(1),
  organization_id:z.string().min(1),
  organization_name:z.string().min(1),
})

app.use('/api/*',loadSatusehatSettings)
app.get('/api/health',c=>c.json({ok:true,service:'fhircare-api'}))

function publicConfig(c:any){
  const e=env(c)
  const s=satusehatConfig(c)
  return {
    environment:s.environment,
    organizationId:s.organizationId||undefined,
    organizationName:s.organizationName||undefined,
    practitionerId:s.practitionerId||undefined,
    practitionerName:s.practitionerName||undefined,
    locationId:s.locationId||undefined,
    rmeOrganizationId:s.organizationId||undefined,
    rmeOrganizationName:s.organizationName||undefined,
    rmePractitionerId:s.practitionerId||undefined,
    rmePractitionerName:s.practitionerName||undefined,
    rmeUrl:s.rmeUrl,
    clientIdConfigured:Boolean(s.clientId),
    clientSecretConfigured:Boolean(s.clientSecret),
    authEnabled:bool(e.APP_AUTH_ENABLED,true),
  }
}

function resourceName(resource:any){
  if(!resource)return ''
  if(typeof resource.name==='string')return resource.name
  const name=Array.isArray(resource.name)?resource.name[0]:undefined
  return name?.text||[Array.isArray(name?.given)?name.given.join(' '):'',name?.family].filter(Boolean).join(' ')
}

function firstBundleResource(trace:any){
  const entries=(trace.response as any)?.entry
  return Array.isArray(entries)?entries.map((entry:any)=>entry.resource).find(Boolean):undefined
}

function locationOptions(trace:any){
  const entries=(trace.response as any)?.entry
  if(!Array.isArray(entries))return []
  return entries.map((entry:any)=>{
    const resource=entry.resource||{}
    return {
      id:String(resource.id||''),
      name:resourceName(resource)||String(resource.description||''),
      status:resource.status,
      physicalType:resource.physicalType?.coding?.[0]?.display||resource.physicalType?.coding?.[0]?.code,
    }
  }).filter((item:any)=>item.id)
}

app.get('/api/config',c=>c.json(publicConfig(c)))

app.post('/api/auth/login',zValidator('json',z.object({username:z.string(),password:z.string()})),async c=>{
  const e=env(c)
  if(!bool(e.APP_AUTH_ENABLED,true))return c.json({ok:true})
  const{username,password}=c.req.valid('json')
  if(username!==(e.APP_USERNAME||'learner')||!await verifyPassword(password,e.APP_PASSWORD_HASH||''))return c.json({message:'Invalid username or password'},401)
  if((e.AUTH_SECRET||'').length<32)return c.json({message:'AUTH_SECRET must be at least 32 chars'},500)
  await createSession(c,username)
  return c.json({ok:true})
})
app.post('/api/auth/logout',c=>{
  clearSession(c)
  return c.json({ok:true})
})
app.get('/api/auth/me',async c=>{
  const e=env(c)
  if(!bool(e.APP_AUTH_ENABLED,true))return c.json({authenticated:true,username:'anonymous'})
  const user=await sessionUser(c)
  return user?c.json({authenticated:true,username:user}):c.json({authenticated:false},401)
})

app.use('/api/settings',requireAuth)
app.use('/api/settings/*',requireAuth)
app.get('/api/settings',c=>c.json(publicConfig(c)))
app.put('/api/settings',zValidator('json',settingSchema),async c=>{
  const current=requestSatusehatSettings(c)
  const input=c.req.valid('json')
  const previousDefaultRmeUrl=SATUSEHAT_ENDPOINTS[current.environment].rmeUrl
  if(input.environment&&input.environment!==current.environment&&input.rmeUrl?.trim()===previousDefaultRmeUrl)input.rmeUrl=''
  const next=mergeSatusehatSettings(current,input)
  await writeSatusehatSettingsCookie(c,next)
  clearSatusehatAccessToken()
  return c.json(publicConfig(c))
})
app.post('/api/settings/organization/resolve',zValidator('json',z.object({organizationId:z.string().optional()})),async c=>{
  const organizationId=(c.req.valid('json').organizationId||satusehatConfig(c).organizationId).trim()
  if(!organizationId)return c.json({message:'SATUSEHAT_ORGANIZATION_ID is required'},400)
  const trace=await fhirRead(c,'Organization',organizationId)
  const organizationName=trace.ok?resourceName(trace.response):''
  if(organizationName){
    const next=mergeSatusehatSettings(requestSatusehatSettings(c),{organizationId,organizationName})
    await writeSatusehatSettingsCookie(c,next)
  }
  return c.json({trace,organizationId,organizationName})
})
app.post('/api/settings/practitioner/search-nik',zValidator('json',z.object({nik:z.string().min(8)})),async c=>{
  const nik=c.req.valid('json').nik.replace(/\D/g,'')
  const searchTrace=await fhirSearch(c,'Practitioner',{identifier:`https://fhir.kemkes.go.id/id/nik|${nik}`})
  const found=firstBundleResource(searchTrace)
  const practitionerId=String(found?.id||'')
  const readTrace=practitionerId?await fhirRead(c,'Practitioner',practitionerId):undefined
  const practitionerName=(readTrace?.ok?resourceName(readTrace.response):'')||resourceName(found)
  if(practitionerId){
    const next=mergeSatusehatSettings(requestSatusehatSettings(c),{practitionerId,practitionerName})
    await writeSatusehatSettingsCookie(c,next)
  }
  return c.json({searchTrace,readTrace,practitionerId:practitionerId||undefined,practitionerName:practitionerName||undefined})
})
app.post('/api/settings/practitioner/resolve',zValidator('json',z.object({practitionerId:z.string().min(1)})),async c=>{
  const practitionerId=c.req.valid('json').practitionerId.trim()
  const trace=await fhirRead(c,'Practitioner',practitionerId)
  const practitionerName=trace.ok?resourceName(trace.response):''
  if(practitionerName){
    const next=mergeSatusehatSettings(requestSatusehatSettings(c),{practitionerId,practitionerName})
    await writeSatusehatSettingsCookie(c,next)
  }
  return c.json({trace,practitionerId,practitionerName})
})
app.post('/api/settings/locations/search',zValidator('json',z.object({organizationId:z.string().optional()})),async c=>{
  const organizationId=(c.req.valid('json').organizationId||satusehatConfig(c).organizationId).trim()
  if(!organizationId)return c.json({message:'SATUSEHAT_ORGANIZATION_ID is required'},400)
  const trace=await fhirSearch(c,'Location',{organization:organizationId})
  return c.json({trace,organizationId,locations:locationOptions(trace)})
})

app.use('/api/rme/*',requireAuth)
app.post('/api/rme/:kind',zValidator('param',z.object({kind:z.enum(['chl','chl-emergency','shl'])})),zValidator('json',rmeSchema),async c=>{
  const{kind}=c.req.valid('param')
  try{
    return c.json(await rmeLink(c,kind,c.req.valid('json')))
  }catch(e:any){
    return c.json({message:e.message},400)
  }
})

app.use('/api/fhir/*',requireAuth)
app.post('/api/fhir/search',zValidator('json',z.object({resourceType:z.string(),params:z.record(z.string())})),async c=>{
  const x=c.req.valid('json')
  try{
    const t=await fhirSearch(c,x.resourceType,x.params)
    return c.json(t)
  }catch(e:any){
    return c.json({message:e.message},400)
  }
})
app.get('/api/fhir/read/:type/:id',async c=>{
  try{
    const t=await fhirRead(c,c.req.param('type'),c.req.param('id'))
    return c.json(t)
  }catch(e:any){
    return c.json({message:e.message},400)
  }
})
app.post('/api/fhir/create/:type',async c=>{
  try{
    const body=await c.req.json()
    const t=await fhirCreate(c,c.req.param('type'),body)
    return c.json(t)
  }catch(e:any){
    return c.json({message:e.message},400)
  }
})
app.put('/api/fhir/update/:type/:id',async c=>{
  try{
    const body=await c.req.json()
    const t=await fhirUpdate(c,c.req.param('type'),c.req.param('id'),body)
    return c.json(t)
  }catch(e:any){
    return c.json({message:e.message},400)
  }
})
app.post('/api/fhir/request',zValidator('json',z.object({method:z.enum(['GET','POST','PUT']),resourceType:z.string(),id:z.string().optional(),params:z.record(z.string()).optional(),body:z.any().optional()})),async c=>{
  const x=c.req.valid('json')
  try{
    const t=x.method==='GET'
      ?(x.id?await fhirRead(c,x.resourceType,x.id):await fhirSearch(c,x.resourceType,x.params||{}))
      :x.method==='POST'
        ?await fhirCreate(c,x.resourceType,x.body)
        :x.id
          ?await fhirUpdate(c,x.resourceType,x.id,x.body)
          :(()=>{throw new Error('PUT requires id')})()
    return c.json(t)
  }catch(e:any){
    return c.json({message:e.message},400)
  }
})

app.onError((err,c)=>c.json({message:err.message||'Unhandled error'},500))
