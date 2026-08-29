import { handle } from 'hono/netlify'
import { app } from '../../server/app'

export default handle(app)
