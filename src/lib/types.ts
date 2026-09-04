export type FhirResource={resourceType:string;id?:string;[key:string]:unknown}
export type FhirBundle=FhirResource&{resourceType:'Bundle';entry?:Array<{resource?:FhirResource}>}
export type ApiTrace={ok:boolean;status:number;method:string;path:string;elapsedMs:number;request?:unknown;response:unknown;service?:string;baseEnvVar?:string}
export type RmeLinkKind='chl'|'chl-emergency'|'shl'
export type RmeViewerInput={patient_id:string;patient_name:string;practitioner_id:string;practitioner_name:string;organization_id:string;organization_name:string}
export type RmeLinkTrace=ApiTrace&{url?:string}
export type AppConfig={environment:'sandbox'|'production';organizationId?:string;practitionerId?:string;locationId?:string;rmeOrganizationId?:string;rmeOrganizationName?:string;rmePractitionerId?:string;rmePractitionerName?:string;authEnabled:boolean}
