import { describe,expect,it } from 'vitest'
import { extractRmeUrl,rmeEndpointPath,rmeRequestPayload,type RmeViewerInput } from './rme'

describe('RME viewer helpers',()=>{
  it('extracts consent verification links from CHL responses',()=>{
    expect(extractRmeUrl('chl',{data:{verificationUrl:'https://example.test/consent?launch=abc'}})).toBe('https://example.test/consent?launch=abc')
  })

  it('extracts national RME links from SHL responses',()=>{
    expect(extractRmeUrl('shl',{data:{shlinkUrl:'https://example.test/rekammedis/?shlink=abc'}})).toBe('https://example.test/rekammedis/?shlink=abc')
  })

  it('returns undefined when the expected link is absent',()=>{
    expect(extractRmeUrl('shl',{success:false,message:'consent required'})).toBeUndefined()
  })

  it('posts emergency consent requests to CHL with the emergency medical summary type',()=>{
    const input:RmeViewerInput={patient_id:'P1',patient_name:'Patient',practitioner_id:'PR1',practitioner_name:'Practitioner',organization_id:'10000004',organization_name:'satusehat'}
    expect(rmeEndpointPath('chl-emergency')).toBe('/chl')
    expect(rmeRequestPayload('chl-emergency',input)).toEqual({...input,type_medical_summary:'EMERGENCY'})
  })
})
