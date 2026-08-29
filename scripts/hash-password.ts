import { randomBytes,pbkdf2Sync } from 'node:crypto'
const password=process.argv[2]
if(!password){console.error('Usage: pnpm auth:hash -- "your-password"');process.exit(1)}
const iterations=210000,salt=randomBytes(16).toString('hex'),hash=pbkdf2Sync(password,salt,iterations,32,'sha256').toString('hex')
console.log(`pbkdf2$${iterations}$${salt}$${hash}`)
