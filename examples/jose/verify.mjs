import assert from 'node:assert/strict'
import { constants, createPublicKey, verify } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const read = (name) => readFile(new URL(name, import.meta.url), 'utf8')
const json = async (name) => JSON.parse(await read(name))
const compact = (await read('id-token.txt')).trim()
assert.equal(await read('id-token.display.txt'), `${compact.replaceAll('.', '.\n')}\n`)
const segments = compact.split('.')
assert.equal(segments.length, 3)
for (const segment of segments) assert.match(segment, /^[A-Za-z0-9_-]+$/)
const [encodedHeader, encodedPayload, encodedSignature] = segments
const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'))
const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
assert.deepEqual(header, await json('header.json'))
assert.deepEqual(payload, await json('payload.json'))
const signingInput = `${encodedHeader}.${encodedPayload}`
assert.equal(signingInput, (await read('signing-input.txt')).trim())
assert.equal(await read('signing-input.display.txt'), `${signingInput.replaceAll('.', '.\n')}\n`)

const jwks = await json('jwks.json')
assert.equal(jwks.keys.length, 1)
const jwk = jwks.keys[0]
assert.deepEqual(Object.keys(jwk).sort(), ['alg', 'e', 'kid', 'kty', 'n', 'use'])
assert.equal(jwk.kty, 'RSA')
assert.equal(jwk.use, 'sig')
assert.equal(jwk.alg, 'RS256')
assert.equal(jwk.kid, header.kid)
assert.equal(header.alg, 'RS256')

// #region signature-verification
// This local public key is trusted by the fixture check, not by a real RP.
const publicKey = createPublicKey({ key: jwk, format: 'jwk' })
assert.ok(publicKey.asymmetricKeyDetails.modulusLength >= 2048)
const keyOptions = { key: publicKey, padding: constants.RSA_PKCS1_PADDING }
const signature = Buffer.from(encodedSignature, 'base64url')
const originalValid = verify('RSA-SHA256', Buffer.from(signingInput, 'ascii'), keyOptions, signature)
console.log(`Original token signature: ${originalValid}`)
assert.equal(originalValid, true)
// #endregion signature-verification

// Modify one payload claim while retaining the original signature.
const changedPayload = Buffer.from(JSON.stringify({ ...payload, sub: 'mallory' })).toString('base64url')
const changedPayloadValid = verify('RSA-SHA256', Buffer.from(`${encodedHeader}.${changedPayload}`, 'ascii'), keyOptions, signature)
console.log(`Changed payload signature: ${changedPayloadValid}`)
assert.equal(changedPayloadValid, false)
const changedSignature = Buffer.from(signature)
changedSignature[0] ^= 1
const changedSignatureValid = verify('RSA-SHA256', Buffer.from(signingInput, 'ascii'), keyOptions, changedSignature)
console.log(`Changed signature bytes: ${changedSignatureValid}`)
assert.equal(changedSignatureValid, false)

const http = await read('token-response.http')
const boundary = http.indexOf('\r\n\r\n')
assert.ok(boundary > 0)
const headers = http.slice(0, boundary)
const body = http.slice(boundary + 4)
assert.match(headers, /^HTTP\/1\.1 200 OK\r\n/)
assert.match(headers, /\r\nContent-Type: application\/json\r\n/)
assert.match(headers, /\r\nCache-Control: no-store\r\n/)
assert.match(headers, /\r\nPragma: no-cache\r\n/)
const length = headers.match(/\r\nContent-Length: (\d+)$/)
assert.ok(length)
assert.equal(Number(length[1]), Buffer.byteLength(body, 'utf8'))
assert.equal(JSON.parse(body).id_token, compact)

console.log('JOSE fixture checks passed: decoded data, public key, signature, tampering, and HTTP consistency.')
console.log('Not an OIDC RP validation: issuer, audience, time, nonce policy and protocol state are not verified here.')
