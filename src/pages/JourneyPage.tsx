import { useState } from 'react'
import { Background,Controls,ReactFlow,type Edge,type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '../lib/api'
import type { FhirBundle,FhirResource } from '../lib/types'
import { useInspector } from '../state/inspector'
import { Button,Card,Field,Input } from '../components/ui'

const types=['Condition','Observation','Procedure','ServiceRequest','DiagnosticReport','MedicationRequest','MedicationDispense']

export function JourneyPage(){
  const[encounter,setEncounter]=useState('')
  const[nodes,setNodes]=useState<Node[]>([])
  const[edges,setEdges]=useState<Edge[]>([])
  const ins=useInspector()

  async function build(){
    const er=await api.fhir.read('Encounter',encounter)
    const e=er.response as any
    const patient=String(e.subject?.reference||'').split('/')[1]
    const resources:FhirResource[]=[e]

    for(const t of types){
      try{
        const params:Record<string,string>=t==='MedicationDispense'
          ?{context:`Encounter/${encounter}`}
          :{encounter:`Encounter/${encounter}`}
        const tr=await api.fhir.search(t,params)
        resources.push(...(((tr.response as FhirBundle).entry||[]).map(x=>x.resource!).filter(Boolean)))
      }catch{
        continue
      }
    }

    const n:Node[]=[
      {id:`Patient/${patient}`,position:{x:0,y:180},data:{label:`Patient\n${patient}`},style:{width:150}},
      {id:`Encounter/${encounter}`,position:{x:230,y:180},data:{label:`Encounter\n${encounter}`},style:{width:170}},
    ]

    resources
      .filter(r=>r.resourceType!=='Encounter')
      .forEach((r,i)=>n.push({id:`${r.resourceType}/${r.id}`,position:{x:500+(i%3)*210,y:40+Math.floor(i/3)*130},data:{label:`${r.resourceType}\n${r.id}`},style:{width:180}}))

    const ed:Edge[]=[{id:'patient-encounter',source:`Patient/${patient}`,target:`Encounter/${encounter}`}]
    n.filter(x=>x.id!==`Patient/${patient}`&&x.id!==`Encounter/${encounter}`)
      .forEach(x=>ed.push({id:`e-${x.id}`,source:`Encounter/${encounter}`,target:x.id}))

    setNodes(n)
    setEdges(ed)
  }

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Patient Journey / FHIR Graph</h1><p className="text-sm text-muted-foreground">Reconstruct graph directly from SATUSEHAT — no local clinical database.</p></div><Card><div className="flex gap-3"><Field label="Encounter ID"><Input value={encounter} onChange={e=>setEncounter(e.target.value)}/></Field><div className="flex items-end"><Button onClick={build} disabled={!encounter}>Build graph</Button></div></div></Card><Card className="h-[560px] overflow-hidden p-0"><ReactFlow nodes={nodes} edges={edges} fitView onNodeClick={async(_,n)=>{const[t,id]=n.id.split('/');if(t&&id)ins.show(await api.fhir.read(t,id))}}><Background/><Controls/></ReactFlow></Card></div>
}
