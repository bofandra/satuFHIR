import { describe, expect, it } from 'vitest'
import { conditionResource, encounterResource, medicationRequest, medicationResource } from './builders'

describe('FHIR payload builders', () => {
  it('builds an Encounter linked to patient, practitioner, location, and organization', () => {
    const r = encounterResource({ org: 'ORG1', patient: 'PAT1', practitioner: 'PR1', location: 'LOC1' }) as any
    expect(r.resourceType).toBe('Encounter')
    expect(r.subject.reference).toBe('Patient/PAT1')
    expect(r.participant[0].individual.reference).toBe('Practitioner/PR1')
    expect(r.location[0].location.reference).toBe('Location/LOC1')
    expect(r.serviceProvider.reference).toBe('Organization/ORG1')
  })

  it('builds a Condition linked to the encounter', () => {
    const r = conditionResource({ patient: 'PAT1', encounter: 'ENC1', code: 'I10', display: 'Hypertension' }) as any
    expect(r.resourceType).toBe('Condition')
    expect(r.code.coding[0].code).toBe('I10')
    expect(r.encounter.reference).toBe('Encounter/ENC1')
  })

  it('uses Medication -> MedicationRequest reference chain', () => {
    const med = medicationResource({ org: 'ORG1', kfa: '93001019', display: 'Example medicine' }) as any
    expect(med.code.coding[0].system).toBe('http://sys-ids.kemkes.go.id/kfa')
    const req = medicationRequest({ org: 'ORG1', patient: 'PAT1', encounter: 'ENC1', practitioner: 'PR1', medicationId: 'MED1', dose: '1 tablet daily' }) as any
    expect(req.medicationReference.reference).toBe('Medication/MED1')
  })
})
