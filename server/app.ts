import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { bool,env,satusehatConfig } from './config'
import { clearSession,createSession,requireAuth,sessionUser,verifyPassword } from './auth'
import { fhirCreate,fhirRead,fhirSearch,fhirUpdate } from './fhir'
export const app=new Hono()
app.get('/api/health',c=>c.json({ok:true,service:'fhircare-api'}))
app.get('/api/config',c=>{const e=env(c),s=satusehatConfig(c);return c.json({environment:s.environment,organizationId:s.organizationId||undefined,practitionerId:e.SATUSEHAT_PRACTITIONER_ID||undefined,locationId:e.SATUSEHAT_LOCATION_ID||undefined,authEnabled:bool(e.APP_AUTH_ENABLED,true)})})
app.post('/api/auth/login',zValidator('json',z.object({username:z.string(),password:z.string()})),async c=>{const e=env(c);if(!bool(e.APP_AUTH_ENABLED,true))return c.json({ok:true});const{username,password}=c.req.valid('json');if(username!==(e.APP_USERNAME||'learner')||!await verifyPassword(password,e.APP_PASSWORD_HASH||''))return c.json({message:'Invalid username or password'},401);if((e.AUTH_SECRET||'').length<32)return c.json({message:'AUTH_SECRET must be at least 32 chars'},500);await createSession(c,username);return c.json({ok:true})})
app.post('/api/auth/logout',c=>{clearSession(c);return c.json({ok:true})})
app.get('/api/auth/me',async c=>{const e=env(c);if(!bool(e.APP_AUTH_ENABLED,true))return c.json({authenticated:true,username:'anonymous'});const user=await sessionUser(c);return user?c.json({authenticated:true,username:user}):c.json({authenticated:false},401)})
app.use('/api/fhir/*',requireAuth)
app.post('/api/fhir/search',zValidator('json',z.object({resourceType:z.string(),params:z.record(z.string())})),async c=>{const x=c.req.valid('json');try{const t=await fhirSearch(c,x.resourceType,x.params);return c.json(t)}catch(e:any){return c.json({message:e.message},400)}})
app.get('/api/fhir/read/:type/:id',async c=>{try{const t=await fhirRead(c,c.req.param('type'),c.req.param('id'));return c.json(t)}catch(e:any){return c.json({message:e.message},400)}})
app.post('/api/fhir/create/:type',async c=>{try{const body=await c.req.json();const t=await fhirCreate(c,c.req.param('type'),body);return c.json(t)}catch(e:any){return c.json({message:e.message},400)}})
app.put('/api/fhir/update/:type/:id',async c=>{try{const body=await c.req.json();const t=await fhirUpdate(c,c.req.param('type'),c.req.param('id'),body);return c.json(t)}catch(e:any){return c.json({message:e.message},400)}})
app.post('/api/fhir/request',zValidator('json',z.object({method:z.enum(['GET','POST','PUT']),resourceType:z.string(),id:z.string().optional(),params:z.record(z.string()).optional(),body:z.any().optional()})),async c=>{const x=c.req.valid('json');try{const t=x.method==='GET'?(x.id?await fhirRead(c,x.resourceType,x.id):await fhirSearch(c,x.resourceType,x.params||{})):x.method==='POST'?await fhirCreate(c,x.resourceType,x.body):x.id?await fhirUpdate(c,x.resourceType,x.id,x.body):(()=>{throw new Error('PUT requires id')})();return c.json(t)}catch(e:any){return c.json({message:e.message},400)}})
app.onError((err,c)=>c.json({message:err.message||'Unhandled error'},500))
