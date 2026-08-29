import { describe,expect,it } from 'vitest'
import { extractRmeUrl } from './rme'

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
})
