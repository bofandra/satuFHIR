import type { LambdaContext,LambdaEvent } from 'hono/aws-lambda'
import { handle } from 'hono/aws-lambda'
import { app } from '../../server/app'

const handlerForApp=handle(app)

function withApiPath(event:LambdaEvent):LambdaEvent{
  if('rawPath' in event){
    const rawPath=event.rawPath.replace(/^\/\.netlify\/functions\/api/,'/api')
    return {...event,rawPath} as LambdaEvent
  }

  const path=event.path.replace(/^\/\.netlify\/functions\/api/,'/api')
  return {...event,path} as LambdaEvent
}

export const handler=(event:LambdaEvent,context?:LambdaContext)=>handlerForApp(withApiPath(event),context)
