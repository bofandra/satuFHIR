import type { Context } from 'hono'
import { requestSatusehatSettings,SATUSEHAT_ENDPOINTS } from './settings'
export type Env=Record<string,string|undefined>
export function env(c?:Context):Env{const bound=(c?.env||{}) as Env;const node=typeof process!=='undefined'?process.env as Env:{};return{...node,...bound}}
export function bool(v:string|undefined,fallback=true){return v==null?fallback:v.toLowerCase()==='true'}
export function satusehatConfig(c:Context){const s=requestSatusehatSettings(c);const urls=SATUSEHAT_ENDPOINTS[s.environment];return{environment:s.environment,clientId:s.clientId,clientSecret:s.clientSecret,organizationId:s.organizationId,organizationName:s.organizationName,practitionerId:s.practitionerId,practitionerName:s.practitionerName,locationId:s.locationId,rmeOrganizationId:s.organizationId,rmeOrganizationName:s.organizationName,rmePractitionerId:s.practitionerId,rmePractitionerName:s.practitionerName,authUrl:urls.authUrl,fhirUrl:urls.fhirUrl,rmeUrl:s.rmeUrl||urls.rmeUrl}}
