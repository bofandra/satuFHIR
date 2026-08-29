import { app } from '../server/app'

export default {
  async fetch(request: Request) {
    const original = new URL(request.url)
    const path = original.searchParams.get('__path')
    if (path !== null) {
      original.pathname = `/api/${path}`.replace(/\/$/, '')
      original.searchParams.delete('__path')
      request = new Request(original.toString(), request)
    }
    return app.fetch(request)
  },
}
