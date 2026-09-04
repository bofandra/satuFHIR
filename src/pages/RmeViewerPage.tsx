import type { ChangeEvent } from 'react'
import { Copy,ExternalLink,FileText,Link2,ShieldAlert,ShieldCheck } from 'lucide-react'
import { useEffect,useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { RmeLinkKind,RmeLinkTrace,RmeViewerInput } from '../lib/types'
import { useInspector } from '../state/inspector'
import { Badge,Button,Card,Field,Input,SecondaryButton } from '../components/ui'

type Results=Partial<Record<RmeLinkKind,RmeLinkTrace>>
const empty:RmeViewerInput={patient_id:'',patient_name:'',practitioner_id:'',practitioner_name:'',organization_id:'',organization_name:''}

function trimInput(input:RmeViewerInput):RmeViewerInput{
  return Object.fromEntries(Object.entries(input).map(([k,v])=>[k,v.trim()])) as RmeViewerInput
}

function message(trace:RmeLinkTrace){
  const response=trace.response as any
  return response?.message||response?.data||`SATUSEHAT returned HTTP ${trace.status}`
}

function ResultLink({kind,trace}:{kind:RmeLinkKind;trace:RmeLinkTrace}){
  const meta=kind==='shl'?{title:'RME Page Link',label:'SHL'}:kind==='chl-emergency'?{title:'Emergency Consent Page Link',label:'CHL Emergency'}:{title:'Consent Page Link',label:'CHL'}
  return <Card><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Link2 className="h-5 w-5 text-teal-700"/><div><h2 className="font-semibold">{meta.title}</h2><div className="mt-1 flex items-center gap-2"><Badge tone={trace.ok?'success':'danger'}>{meta.label}</Badge><span className="text-xs text-muted-foreground">{trace.status} · {trace.elapsedMs} ms</span></div></div></div><SecondaryButton onClick={()=>navigator.clipboard.writeText(trace.url||JSON.stringify(trace.response,null,2))}><Copy className="mr-2 h-4 w-4"/>Copy</SecondaryButton></div>{trace.url?<a className="mt-4 flex items-center gap-2 break-all rounded-lg border px-3 py-2 text-sm text-teal-800 hover:bg-muted" href={trace.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 shrink-0"/>{trace.url}</a>:<p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{message(trace)}</p>}</Card>
}

export function RmeViewerPage(){
  const[sp]=useSearchParams()
  const cfg=useQuery({queryKey:['config'],queryFn:api.config})
  const{show}=useInspector()
  const[form,setForm]=useState<RmeViewerInput>(empty)
  const[loading,setLoading]=useState<RmeLinkKind|null>(null)
  const[error,setError]=useState('')
  const[results,setResults]=useState<Results>({})
  const queryPatientId=sp.get('patientId')||''
  const queryPatientName=sp.get('patientName')||''

  useEffect(()=>{setForm(f=>({...f,patient_id:queryPatientId||f.patient_id,patient_name:queryPatientName||f.patient_name}))},[queryPatientId,queryPatientName])
  useEffect(()=>{if(cfg.data)setForm(f=>({...f,practitioner_id:f.practitioner_id||cfg.data.rmePractitionerId||'',practitioner_name:f.practitioner_name||cfg.data.rmePractitionerName||'',organization_id:f.organization_id||cfg.data.rmeOrganizationId||'',organization_name:f.organization_name||cfg.data.rmeOrganizationName||''}))},[cfg.data])

  const ready=Object.values(form).every(v=>v.trim())
  async function generate(kind:RmeLinkKind){
    setLoading(kind)
    setError('')
    try{
      const trace=await api.rme.generate(kind,trimInput(form))
      setResults(r=>({...r,[kind]:trace}))
      show(trace)
      if(!trace.ok||!trace.url)setError(message(trace))
    }catch(e:any){
      setError(e.message)
    }finally{
      setLoading(null)
    }
  }
  const set=(key:keyof RmeViewerInput)=>(e:ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,[key]:e.target.value}))

  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">RME Viewer</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Generate SATUSEHAT consent and national medical record links from server-side credentials.</p></div><Badge tone={cfg.data?.environment==='production'?'danger':'success'}>{cfg.data?.environment?.toUpperCase()||'...'}</Badge></div><Card><div className="grid gap-4 md:grid-cols-2"><Field label="Patient ID"><Input value={form.patient_id} onChange={set('patient_id')} placeholder="P..." /></Field><Field label="Patient name"><Input value={form.patient_name} onChange={set('patient_name')} /></Field><Field label="Practitioner ID"><Input value={form.practitioner_id} onChange={set('practitioner_id')} /></Field><Field label="Practitioner name"><Input value={form.practitioner_name} onChange={set('practitioner_name')} /></Field><Field label="Organization ID"><Input value={form.organization_id} onChange={set('organization_id')} /></Field><Field label="Organization name"><Input value={form.organization_name} onChange={set('organization_name')} /></Field></div><div className="mt-5 flex flex-wrap gap-3"><Button onClick={()=>generate('chl')} disabled={!ready||loading!==null}><ShieldCheck className="mr-2 h-4 w-4"/>{loading==='chl'?'Generating...':'Generate consent page link'}</Button><Button onClick={()=>generate('chl-emergency')} disabled={!ready||loading!==null}><ShieldAlert className="mr-2 h-4 w-4"/>{loading==='chl-emergency'?'Generating...':'Generate emergency consent page link'}</Button><Button onClick={()=>generate('shl')} disabled={!ready||loading!==null}><FileText className="mr-2 h-4 w-4"/>{loading==='shl'?'Generating...':'Generate RME page link'}</Button></div>{error&&<p className="mt-4 text-sm text-red-600">{error}</p>}</Card><div className="grid gap-4 lg:grid-cols-2">{results.chl&&<ResultLink kind="chl" trace={results.chl}/>} {results['chl-emergency']&&<ResultLink kind="chl-emergency" trace={results['chl-emergency']}/>} {results.shl&&<ResultLink kind="shl" trace={results.shl}/>}</div></div>
}
