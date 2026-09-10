import { useEffect,useMemo,useState } from 'react'
import { useQuery,useQueryClient } from '@tanstack/react-query'
import { Building2,Check,MapPin,RefreshCw,Save,Search,Shield,UserSearch } from 'lucide-react'
import { api } from '../lib/api'
import type { ApiTrace,LocationOption,SatusehatEnvironment } from '../lib/types'
import { useInspector } from '../state/inspector'
import { Badge,Button,Card,Field,Input,SecondaryButton } from '../components/ui'

const defaults:Record<SatusehatEnvironment,{rmeUrl:string}>={
  sandbox:{rmeUrl:'https://api-satusehat-stg.dto.kemkes.go.id/ssrme/v2/ntl'},
  production:{rmeUrl:'https://api-satusehat.kemkes.go.id/ssrme/v2/ntl'},
}

function tone(ok:boolean|undefined){
  return ok?'success':'warning'
}

function traceButton(label:string,trace:ApiTrace|undefined,onClick:(trace:ApiTrace)=>void){
  return trace?<SecondaryButton onClick={()=>onClick(trace)}><Search className="mr-2 h-4 w-4"/>{label}</SecondaryButton>:null
}

export function SettingsPage(){
  const qc=useQueryClient()
  const inspector=useInspector()
  const cfg=useQuery({queryKey:['settings'],queryFn:api.settings.get})
  const[form,setForm]=useState({environment:'sandbox' as SatusehatEnvironment,clientId:'',clientSecret:'',organizationId:'',rmeUrl:defaults.sandbox.rmeUrl})
  const[nik,setNik]=useState('')
  const[locations,setLocations]=useState<LocationOption[]>([])
  const[traces,setTraces]=useState<{organization?:ApiTrace;practitionerSearch?:ApiTrace;practitionerRead?:ApiTrace;location?:ApiTrace}>({})
  const[busy,setBusy]=useState('')
  const[message,setMessage]=useState('')
  const[error,setError]=useState('')

  useEffect(()=>{
    if(!cfg.data)return
    setForm(current=>({
      environment:cfg.data.environment,
      clientId:'',
      clientSecret:'',
      organizationId:cfg.data.organizationId||current.organizationId,
      rmeUrl:cfg.data.rmeUrl||defaults[cfg.data.environment].rmeUrl,
    }))
  },[cfg.data])

  const canCallSatusehat=useMemo(()=>Boolean((cfg.data?.clientIdConfigured&&cfg.data?.clientSecretConfigured)||(form.clientId.trim()&&form.clientSecret.trim())),[cfg.data,form.clientId,form.clientSecret])

  function setField(key:keyof typeof form,value:string){
    setForm(current=>({...current,[key]:value}))
  }

  async function refreshConfig(){
    await Promise.all([
      qc.invalidateQueries({queryKey:['config']}),
      qc.invalidateQueries({queryKey:['settings']}),
    ])
  }

  async function save(label='Settings saved',manageBusy=true){
    if(manageBusy)setBusy('save')
    setError('')
    setMessage('')
    try{
      await api.settings.update({
        environment:form.environment,
        clientId:form.clientId,
        clientSecret:form.clientSecret,
        organizationId:form.organizationId,
        rmeUrl:form.rmeUrl,
      })
      setForm(current=>({...current,clientId:'',clientSecret:''}))
      await refreshConfig()
      setMessage(label)
    }catch(e:any){
      setError(e.message)
      throw e
    }finally{
      if(manageBusy)setBusy('')
    }
  }

  async function withSavedSettings<T>(fn:()=>Promise<T>){
    await save('Connection saved',false)
    return fn()
  }

  async function resolveOrganization(){
    setBusy('organization')
    setError('')
    setMessage('')
    try{
      const result=await withSavedSettings(()=>api.settings.resolveOrganization(form.organizationId))
      setTraces(current=>({...current,organization:result.trace}))
      inspector.show(result.trace)
      await refreshConfig()
      setMessage(result.organizationName?`Organization/${result.organizationId}: ${result.organizationName}`:`Organization/${result.organizationId} returned no name`)
    }catch(e:any){
      setError(e.message)
    }finally{
      setBusy('')
    }
  }

  async function searchPractitioner(){
    setBusy('practitioner')
    setError('')
    setMessage('')
    try{
      const result=await withSavedSettings(()=>api.settings.searchPractitionerByNik(nik))
      setTraces(current=>({...current,practitionerSearch:result.searchTrace,practitionerRead:result.readTrace}))
      inspector.show(result.searchTrace)
      await refreshConfig()
      setMessage(result.practitionerId?`Practitioner/${result.practitionerId}: ${result.practitionerName||'name not returned'}`:'Practitioner not found')
    }catch(e:any){
      setError(e.message)
    }finally{
      setBusy('')
    }
  }

  async function searchLocations(){
    setBusy('locations')
    setError('')
    setMessage('')
    try{
      const result=await withSavedSettings(()=>api.settings.searchLocations(form.organizationId))
      setLocations(result.locations)
      setTraces(current=>({...current,location:result.trace}))
      inspector.show(result.trace)
      setMessage(`${result.locations.length} Location result(s)`)
    }catch(e:any){
      setError(e.message)
    }finally{
      setBusy('')
    }
  }

  async function chooseLocation(locationId:string){
    setBusy(`location:${locationId}`)
    setError('')
    setMessage('')
    try{
      await api.settings.update({locationId})
      await refreshConfig()
      setMessage(`Location/${locationId} selected`)
    }catch(e:any){
      setError(e.message)
    }finally{
      setBusy('')
    }
  }

  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Settings</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Runtime SATUSEHAT connection and onboarding references.</p></div><Badge tone={form.environment==='production'?'danger':'success'}>{form.environment.toUpperCase()}</Badge></div><div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]"><Card><div className="flex items-center gap-3"><Shield className="h-5 w-5 text-teal-700"/><h2 className="font-semibold">Connection</h2></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="SATUSEHAT_ENV"><select className="h-10 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.environment} onChange={e=>{const next=e.target.value as SatusehatEnvironment;setForm(current=>({ ...current,environment:next,rmeUrl:!current.rmeUrl||current.rmeUrl===defaults[current.environment].rmeUrl?defaults[next].rmeUrl:current.rmeUrl }))}}><option value="sandbox">sandbox</option><option value="production">production</option></select></Field><Field label="SATUSEHAT_RME_URL"><Input value={form.rmeUrl} onChange={e=>setField('rmeUrl',e.target.value)} /></Field><Field label="SATUSEHAT_CLIENT_ID"><Input value={form.clientId} onChange={e=>setField('clientId',e.target.value)} autoComplete="off" placeholder={cfg.data?.clientIdConfigured?'Configured':'Client ID'} /></Field><Field label="SATUSEHAT_CLIENT_SECRET"><Input value={form.clientSecret} onChange={e=>setField('clientSecret',e.target.value)} type="password" autoComplete="new-password" placeholder={cfg.data?.clientSecretConfigured?'Configured':'Client Secret'} /></Field></div><div className="mt-5 flex flex-wrap items-center gap-3"><Button onClick={()=>void save()} disabled={busy!==''}><Save className="mr-2 h-4 w-4"/>{busy==='save'?'Saving...':'Save settings'}</Button><Badge tone={tone(cfg.data?.clientIdConfigured)}>Client ID {cfg.data?.clientIdConfigured?'set':'missing'}</Badge><Badge tone={tone(cfg.data?.clientSecretConfigured)}>Client Secret {cfg.data?.clientSecretConfigured?'set':'missing'}</Badge></div></Card><Card><div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-teal-700"/><h2 className="font-semibold">Organization</h2></div><div className="mt-5 grid gap-4"><Field label="SATUSEHAT_ORGANIZATION_ID"><Input value={form.organizationId} onChange={e=>setField('organizationId',e.target.value)} placeholder="Organization ID" /></Field><div className="rounded-lg border p-3 text-sm"><div className="font-medium">{cfg.data?.organizationName||'Organization name not loaded'}</div><div className="mt-1 text-xs text-muted-foreground">{cfg.data?.organizationId?'Organization/'+cfg.data.organizationId:'No Organization ID'}</div></div><div className="flex flex-wrap gap-3"><Button onClick={resolveOrganization} disabled={!canCallSatusehat||!form.organizationId||busy!==''}><RefreshCw className="mr-2 h-4 w-4"/>{busy==='organization'?'Loading...':'GET Organization/:id'}</Button>{traceButton('Inspect Organization',traces.organization,inspector.show)}</div></div></Card></div><div className="grid gap-4 xl:grid-cols-2"><Card><div className="flex items-center gap-3"><UserSearch className="h-5 w-5 text-teal-700"/><h2 className="font-semibold">Practitioner</h2></div><div className="mt-5 grid gap-4"><Field label="NIK Practitioner"><Input value={nik} onChange={e=>setNik(e.target.value.replace(/\D/g,''))} maxLength={16} placeholder="16 digit NIK" /></Field><div className="rounded-lg border p-3 text-sm"><div className="font-medium">{cfg.data?.practitionerName||'Practitioner name not loaded'}</div><div className="mt-1 text-xs text-muted-foreground">{cfg.data?.practitionerId?'Practitioner/'+cfg.data.practitionerId:'No Practitioner ID'}</div></div><div className="flex flex-wrap gap-3"><Button onClick={searchPractitioner} disabled={!canCallSatusehat||nik.length<8||busy!==''}><UserSearch className="mr-2 h-4 w-4"/>{busy==='practitioner'?'Searching...':'GET Practitioner by NIK'}</Button>{traceButton('Inspect Search',traces.practitionerSearch,inspector.show)}{traceButton('Inspect Read',traces.practitionerRead,inspector.show)}</div></div></Card><Card><div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-teal-700"/><h2 className="font-semibold">Location</h2></div><div className="mt-5 grid gap-4"><div className="rounded-lg border p-3 text-sm"><div className="font-medium">{cfg.data?.locationId?'Location/'+cfg.data.locationId:'No Location selected'}</div><div className="mt-1 text-xs text-muted-foreground">{form.organizationId?'organization='+form.organizationId:'No Organization ID'}</div></div><div className="flex flex-wrap gap-3"><Button onClick={searchLocations} disabled={!canCallSatusehat||!form.organizationId||busy!==''}><MapPin className="mr-2 h-4 w-4"/>{busy==='locations'?'Searching...':'GET Location by Organization ID'}</Button>{traceButton('Inspect Location Search',traces.location,inspector.show)}</div><div className="grid gap-2">{locations.map(location=><div key={location.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><div className="text-sm font-medium">{location.name||'Unnamed Location'}</div><div className="mt-1 text-xs text-muted-foreground">Location/{location.id}{location.physicalType?` - ${location.physicalType}`:''}{location.status?` - ${location.status}`:''}</div></div><SecondaryButton onClick={()=>chooseLocation(location.id)} disabled={busy!==''}>{busy===`location:${location.id}`?<RefreshCw className="mr-2 h-4 w-4"/>:<Check className="mr-2 h-4 w-4"/>}Use</SecondaryButton></div>)}</div></div></Card></div>{message&&<Card className="border-emerald-200 bg-emerald-50 text-sm text-emerald-800">{message}</Card>}{error&&<Card className="border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>}</div>
}
