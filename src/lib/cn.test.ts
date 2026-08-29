import { describe,expect,it } from 'vitest'
import { cn } from './cn'
describe('cn',()=>{it('merges class names',()=>expect(cn('p-2','p-4')).toContain('p-4'))})
