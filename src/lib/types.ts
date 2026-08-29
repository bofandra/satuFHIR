export type FhirResource={resourceType:string;id?:string;[key:string]:unknown}
export type FhirBundle=FhirResource&{resourceType:'Bundle';entry?:Array<{resource?:FhirResource}>}
export type ApiTrace={ok:boolean;status:number;method:string;path:string;elapsedMs:number;request?:unknown;response:unknown}
export type AppConfig={environment:'sandbox'|'production';organizationId?:string;practitionerId?:string;locationId?:string;authEnabled:boolean}
