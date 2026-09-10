import { afterEach,describe,expect,it } from 'vitest'
import { app } from './app'
import { mergeSatusehatSettings,normalizeSatusehatSettings,SATUSEHAT_ENDPOINTS } from './settings'

const originalAuthEnabled=process.env.APP_AUTH_ENABLED
const originalAuthSecret=process.env.AUTH_SECRET

function restoreEnv(key:string,value:string|undefined){
  if(value===undefined)delete process.env[key]
  else process.env[key]=value
}

afterEach(()=>{
  restoreEnv('APP_AUTH_ENABLED',originalAuthEnabled)
  restoreEnv('AUTH_SECRET',originalAuthSecret)
})

describe('SATUSEHAT runtime settings',()=>{
  it('keeps existing client credentials when update fields are blank',()=>{
    const current=normalizeSatusehatSettings({clientId:'client-a',clientSecret:'secret-a'})
    const next=mergeSatusehatSettings(current,{environment:'production',clientId:'',clientSecret:''})
    expect(next.environment).toBe('production')
    expect(next.clientId).toBe('client-a')
    expect(next.clientSecret).toBe('secret-a')
  })

  it('clears derived organization values when Organization ID changes',()=>{
    const current=normalizeSatusehatSettings({organizationId:'org-a',organizationName:'Old Org',locationId:'loc-a'})
    const next=mergeSatusehatSettings(current,{organizationId:'org-b'})
    expect(next.organizationId).toBe('org-b')
    expect(next.organizationName).toBe('')
    expect(next.locationId).toBe('')
  })

  it('selects SATUSEHAT base URLs from the configured environment',()=>{
    expect(SATUSEHAT_ENDPOINTS.sandbox.fhirUrl).toContain('api-satusehat-stg.dto.kemkes.go.id')
    expect(SATUSEHAT_ENDPOINTS.production.fhirUrl).toBe('https://api-satusehat.kemkes.go.id/fhir-r4/v1')
  })

  it('does not return SATUSEHAT client credentials from config responses',async()=>{
    process.env.APP_AUTH_ENABLED='false'
    process.env.AUTH_SECRET='x'.repeat(32)

    const save=await app.request('/api/settings',{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        environment:'production',
        clientId:'test-client-id',
        clientSecret:'test-client-secret',
        organizationId:'10000004',
      }),
    })
    expect(save.status).toBe(200)
    const cookie=save.headers.get('set-cookie')?.split(';')[0]
    expect(cookie).toBeTruthy()

    const config=await app.request('/api/config',{headers:{Cookie:cookie!}})
    const body=await config.json() as Record<string,unknown>
    expect(body.environment).toBe('production')
    expect(body.organizationId).toBe('10000004')
    expect(body.clientIdConfigured).toBe(true)
    expect(body.clientSecretConfigured).toBe(true)
    expect(body.clientId).toBeUndefined()
    expect(body.clientSecret).toBeUndefined()
  })
})
