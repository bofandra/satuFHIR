import { app } from '../../server/app'
export const onRequest=(context:any)=>app.fetch(context.request,context.env,context)
