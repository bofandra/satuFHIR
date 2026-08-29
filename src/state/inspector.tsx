import { createContext,useCallback,useContext,useMemo,useState,type ReactNode } from 'react'
import type { ApiTrace } from '../lib/types'
type State={trace:ApiTrace|null;open:boolean;show:(trace:ApiTrace)=>void;close:()=>void}
const Ctx=createContext<State|null>(null)
export function InspectorProvider({children}:{children:ReactNode}){const[trace,setTrace]=useState<ApiTrace|null>(null);const[open,setOpen]=useState(false);const show=useCallback((t:ApiTrace)=>{setTrace(t);setOpen(true)},[]);const close=useCallback(()=>setOpen(false),[]);const value=useMemo(()=>({trace,open,show,close}),[trace,open,show,close]);return <Ctx.Provider value={value}>{children}</Ctx.Provider>}
// eslint-disable-next-line react-refresh/only-export-components
export function useInspector(){const v=useContext(Ctx);if(!v)throw new Error('InspectorProvider missing');return v}
