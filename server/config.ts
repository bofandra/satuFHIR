import type { Context } from 'hono'
export type Env=Record<string,string|undefined>
export function env(c?:Context):Env{const bound=(c?.env||{}) as Env;const node=typeof process!=='undefined'?process.env as Env:{};return{...node,...bound}}
export function bool(v:string|undefined,fallback=true){return v==null?fallback:v.toLowerCase()==='true'}
export function satusehatConfig(c:Context){const e=env(c);return{environment:(e.SATUSEHAT_ENV||'sandbox') as 'sandbox'|'production',clientId:e.SATUSEHAT_CLIENT_ID||'',clientSecret:e.SATUSEHAT_CLIENT_SECRET||'',organizationId:e.SATUSEHAT_ORGANIZATION_ID||'',authUrl:e.SATUSEHAT_AUTH_URL||'https://api-satusehat-stg.dto.kemkes.go.id/oauth2/v1',fhirUrl:e.SATUSEHAT_FHIR_URL||'https://api-satusehat-stg.dto.kemkes.go.id/fhir-r4/v1'}}
