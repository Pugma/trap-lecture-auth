import { readFileSync } from 'node:fs'

// 公開教材データのデコード専用。署名や OIDC Claims は検証しない。
const token = readFileSync(new URL('./id-token.txt', import.meta.url), 'utf8').trim()
const parts = token.split('.')
if (parts.length !== 3) throw new Error('Expected a compact signed JWT with three parts')
const [header, payload, signature] = parts
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
console.log('Parts:', parts.length)
console.log('Header:', decode(header))
console.log('Payload:', decode(payload))

const changedPayload = { ...decode(payload), sub: 'bob' }
const changed = Buffer.from(JSON.stringify(changedPayload)).toString('base64url')
const changedToken = `${header}.${changed}.${signature}`
console.log('Changed payload:', decode(changedToken.split('.')[1]))
console.log('Decoded only; signature and OIDC Claims have NOT been validated.')
