import { useCallback,useEffect,useMemo,useState } from 'react'
import { Link,useParams,useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useInspector } from '../state/inspector'
import type { FhirBundle,FhirResource } from '../lib/types'
import { Badge,Button,Card,Field,Input,SecondaryButton } from '../components/ui'
import { bpResource,conditionResource,encounterResource,procedureResource,vitalResource } from '../fhir/builders'

const relatedTypes=['Condition','Observation','Procedure','ServiceRequest','DiagnosticReport','MedicationRequest','MedicationDispense']

export function EncountersPage(){
  const[sp]=useSearchParams()
  const patient=sp.get('patient')||''
  const[items,setItems]=useState<FhirResource[]>([])
  const[error,setError]=useState('')
  const{show}=useInspector()
  const cfg=useQuery({queryKey:['config'],queryFn:api.config})
  const[practitioner,setPractitioner]=useState('')
  const[location,setLocation]=useState('')

  useEffect(()=>{
    if(cfg.data){
      setPractitioner(cfg.data.practitionerId||'')
      setLocation(cfg.data.locationId||'')
    }
  },[cfg.data])

  const load=useCallback(async()=>{
    if(!patient)return
    try{
      const t=await api.fhir.search('Encounter',{subject:patient})
      show(t)
      setItems(((t.response as FhirBundle).entry||[]).map(e=>e.resource!).filter(Boolean))
    }catch(e:any){
      setError(e.message)
    }
  },[patient,show])

  useEffect(()=>{void load()},[load])

  async function start(){
    if(!cfg.data?.organizationId)return setError('SATUSEHAT_ORGANIZATION_ID is required')
    try{
      const t=await api.fhir.create('Encounter',encounterResource({org:cfg.data.organizationId,patient,practitioner,location}))
      show(t)
      localStorage.setItem('fhircare.progress','2')
      await load()
    }catch(e:any){
      setError(e.message)
    }
  }

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Encounters</h1><p className="text-sm text-muted-foreground">Encounter adalah episode pelayanan yang menjadi anchor bagi resource klinis lainnya.</p></div>{!patient?<Card><p className="text-sm">Mulai dari <Link className="text-primary underline" to="/patients">Patients</Link> lalu pilih Patient.</p></Card>:<><Card><h2 className="font-semibold">Start outpatient encounter</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><Field label="Patient ID"><Input value={patient} readOnly/></Field><Field label="Practitioner IHS"><Input value={practitioner} onChange={e=>setPractitioner(e.target.value)}/></Field><Field label="Location ID"><Input value={location} onChange={e=>setLocation(e.target.value)}/></Field><div className="flex items-end"><Button onClick={start} disabled={!practitioner||!location}>POST Encounter</Button></div></div>{error&&<p className="mt-3 text-sm text-red-600">{error}</p>}</Card><div className="grid gap-3">{items.map(e=><Card key={e.id} className="flex items-center justify-between"><div><div className="font-semibold">Encounter/{e.id}</div><div className="mt-1 text-xs text-muted-foreground">status: {String(e.status)}</div></div><Link to={`/encounters/${e.id}`}><Button>Open workspace</Button></Link></Card>)}</div></>}</div>
}

export function EncounterPage(){
  const{id=''}=useParams()
  const{show}=useInspector()
  const cfg=useQuery({queryKey:['config'],queryFn:api.config})
  const encounter=useQuery({queryKey:['encounter',id],queryFn:()=>api.fhir.read('Encounter',id)})
  const r=encounter.data?.response as any
  const patient=String(r?.subject?.reference||'').split('/')[1]||''
  const[timeline,setTimeline]=useState<FhirResource[]>([])
  const[error,setError]=useState('')
  const[dx,setDx]=useState({code:'I10',display:'Essential (primary) hypertension'})
  const[vital,setVital]=useState({kind:'temperature' as 'temperature'|'weight'|'height',value:'36.7',sys:'120',dia:'80'})
  const[proc,setProc]=useState({code:'386053000',display:'Evaluation procedure'})
  const practitioner=cfg.data?.practitionerId||String(r?.participant?.[0]?.individual?.reference||'').split('/')[1]||''

  const loadRelated=useCallback(async()=>{
    if(!id)return
    const results=await Promise.all(relatedTypes.map(async t=>{
      try{
        const params:Record<string,string>=t==='MedicationDispense'
          ?{context:`Encounter/${id}`}
          :{encounter:`Encounter/${id}`}
        const tr=await api.fhir.search(t,params)
        return ((tr.response as FhirBundle).entry||[]).map(e=>e.resource!).filter(Boolean)
      }catch{
        return []
      }
    }))
    setTimeline(results.flat())
  },[id])

  useEffect(()=>{if(patient)void loadRelated()},[patient,loadRelated])

  const actions=useMemo(()=>({
    async dx(){
      try{
        const t=await api.fhir.create('Condition',conditionResource({patient,encounter:id,code:dx.code,display:dx.display}))
        show(t)
        localStorage.setItem('fhircare.progress','3')
        await loadRelated()
      }catch(e:any){
        setError(e.message)
      }
    },
    async vital(){
      try{
        const t=await api.fhir.create('Observation',vitalResource({patient,encounter:id,practitioner,kind:vital.kind,value:Number(vital.value)}))
        show(t)
        localStorage.setItem('fhircare.progress','4')
        await loadRelated()
      }catch(e:any){
        setError(e.message)
      }
    },
    async bp(){
      try{
        const t=await api.fhir.create('Observation',bpResource({patient,encounter:id,practitioner,systolic:Number(vital.sys),diastolic:Number(vital.dia)}))
        show(t)
        await loadRelated()
      }catch(e:any){
        setError(e.message)
      }
    },
    async proc(){
      try{
        const t=await api.fhir.create('Procedure',procedureResource({patient,encounter:id,practitioner,code:proc.code,display:proc.display}))
        show(t)
        await loadRelated()
      }catch(e:any){
        setError(e.message)
      }
    },
  }),[patient,id,practitioner,dx,vital,proc,show,loadRelated])

  async function finish(){
    const current=structuredClone(r)
    current.status='finished'
    current.period={...(current.period||{}),end:new Date().toISOString()}
    const t=await api.fhir.update('Encounter',id,current)
    show(t)
    localStorage.setItem('fhircare.progress','8')
    await encounter.refetch()
  }

  if(encounter.isLoading)return <p>Loading encounter…</p>
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex gap-2"><h1 className="text-2xl font-bold">Encounter Workspace</h1><Badge tone={r?.status==='finished'?'success':'warning'}>{String(r?.status||'unknown')}</Badge></div><p className="text-sm text-muted-foreground">Patient/{patient} · Encounter/{id}</p></div><div className="flex gap-2"><SecondaryButton onClick={()=>encounter.data&&show(encounter.data)}>Inspect Encounter</SecondaryButton>{r?.status!=='finished'&&<Button onClick={finish}>Finish Encounter</Button>}</div></div>{error&&<Card className="border-red-200 text-sm text-red-600">{error}</Card>}<div className="grid gap-4 xl:grid-cols-3"><Card><h3 className="font-semibold">Diagnosis → Condition</h3><div className="mt-3 grid gap-3"><Field label="ICD-10"><Input value={dx.code} onChange={e=>setDx({...dx,code:e.target.value})}/></Field><Field label="Display"><Input value={dx.display} onChange={e=>setDx({...dx,display:e.target.value})}/></Field><Button onClick={actions.dx}>Save diagnosis</Button></div></Card><Card><h3 className="font-semibold">Vital signs → Observation</h3><div className="mt-3 grid gap-3"><select className="h-10 rounded-md border px-3 text-sm" value={vital.kind} onChange={e=>setVital({...vital,kind:e.target.value as 'temperature'|'weight'|'height'})}><option value="temperature">Temperature</option><option value="weight">Weight</option><option value="height">Height</option></select><Input type="number" step="0.1" value={vital.value} onChange={e=>setVital({...vital,value:e.target.value})}/><Button onClick={actions.vital}>Save vital</Button><div className="grid grid-cols-2 gap-2"><Input value={vital.sys} onChange={e=>setVital({...vital,sys:e.target.value})} placeholder="Systolic"/><Input value={vital.dia} onChange={e=>setVital({...vital,dia:e.target.value})} placeholder="Diastolic"/></div><SecondaryButton onClick={actions.bp}>Save blood pressure</SecondaryButton></div></Card><Card><h3 className="font-semibold">Procedure</h3><div className="mt-3 grid gap-3"><Field label="SNOMED CT"><Input value={proc.code} onChange={e=>setProc({...proc,code:e.target.value})}/></Field><Field label="Display"><Input value={proc.display} onChange={e=>setProc({...proc,display:e.target.value})}/></Field><Button onClick={actions.proc}>Save procedure</Button></div></Card></div><Card><div className="flex items-center justify-between"><h3 className="font-semibold">Encounter timeline</h3><SecondaryButton onClick={loadRelated}>Refresh from SATUSEHAT</SecondaryButton></div><div className="mt-4 grid gap-2">{timeline.length===0?<p className="text-sm text-muted-foreground">No related resources loaded yet.</p>:timeline.map((x,i)=><button key={`${x.resourceType}-${x.id}-${i}`} onClick={async()=>x.id&&show(await api.fhir.read(x.resourceType,x.id))} className="flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted"><span className="font-medium">{x.resourceType}</span><code className="text-xs text-muted-foreground">{x.id}</code></button>)}</div></Card></div>
}
