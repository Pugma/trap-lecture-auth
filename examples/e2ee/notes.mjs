import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const { subtle } = globalThis.crypto
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const hex = (value) => Uint8Array.from(Buffer.from(value, 'hex'))
const toHex = (value) => Buffer.from(value).toString('hex')
const b64u = (value) => Buffer.from(value).toString('base64url')
const fromB64u = (value) => Uint8Array.from(Buffer.from(value, 'base64url'))
const concat = (...parts) => Uint8Array.from(parts.flatMap((part) => [...part]))
const vector = JSON.parse(await readFile(new URL('prf-test-vector.json', import.meta.url), 'utf8'))

// #region prf-simulation
// The browser computes salt1 from the RP's eval.first input (WebAuthn L3 §10.1.4).
const prfSalt = async (evalFirst) =>
  new Uint8Array(await subtle.digest('SHA-256', concat(encoder.encode('WebAuthn PRF'), [0x00], evalFirst)))

// Inside a CTAP2 hmac-secret authenticator: HMAC-SHA-256(CredRandom, salt1).
// This simulates the authenticator only; a real RP never sees CredRandom.
const authenticatorPrf = async (credRandom, salt) => {
  const key = await subtle.importKey('raw', credRandom, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await subtle.sign('HMAC', key, salt))
}
// #endregion prf-simulation

const salt1 = await prfSalt(hex(vector.prfEvalFirst))
assert.equal(toHex(salt1), vector.salt1)
const prfOutputA = await authenticatorPrf(hex(vector.authenticatorCredRandom), salt1)
console.log(`PRF output matches WebAuthn test vector: ${toHex(prfOutputA) === vector.prfResultsFirst}`)
assert.equal(toHex(prfOutputA), vector.prfResultsFirst)

// #region key-hierarchy
// PRF output -> key-encryption key (KEK). The KEK is never stored anywhere.
const deriveKek = async (prfOutput) => {
  const material = await subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey'])
  return subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: encoder.encode('trap-lecture-auth e2ee kek v1') },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

// The data key (DEK) encrypts notes. The server stores it only in wrapped form, once per passkey.
const wrapDataKey = async (dataKey, kek, aad) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrapped = await subtle.wrapKey('raw', dataKey, kek, { name: 'AES-GCM', iv, additionalData: aad })
  return { iv: b64u(iv), wrapped: b64u(wrapped) }
}
const unwrapDataKey = (entry, kek, aad, extractable = false) =>
  subtle.unwrapKey('raw', fromB64u(entry.wrapped), kek, { name: 'AES-GCM', iv: fromB64u(entry.iv), additionalData: aad },
    { name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt'])
// #endregion key-hierarchy

// #region note-encryption
const noteAad = (userId, noteId) => encoder.encode(`note:${userId}:${noteId}`)
const wrapAad = (userId, credentialId) => encoder.encode(`wrap:${userId}:${credentialId}`)

const encryptNote = async (dataKey, userId, noteId, text) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: noteAad(userId, noteId) }, dataKey, encoder.encode(text))
  return { noteId, iv: b64u(iv), ciphertext: b64u(ciphertext) }
}
const decryptNote = async (dataKey, userId, note) => {
  const plaintext = await subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64u(note.iv), additionalData: noteAad(userId, note.noteId) }, dataKey, fromB64u(note.ciphertext))
  return decoder.decode(plaintext)
}
// #endregion note-encryption

const rejects = async (promise) => {
  try {
    await promise
    return false
  } catch {
    return true
  }
}

// --- Registration on device A: create a DEK and store it wrapped under passkey A's KEK ---
const userId = 'alice'
const secretText = 'traP 合宿の集合場所は 3 号館前'
const dataKey = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
const credA = { credentialId: 'cred-A', prfInput: b64u(hex(vector.prfEvalFirst)) }
const server = {
  userId,
  keySlots: [{ ...credA, ...await wrapDataKey(dataKey, await deriveKek(prfOutputA), wrapAad(userId, credA.credentialId)) }],
  notes: [await encryptNote(dataKey, userId, 'note-1', secretText)],
}

// #region server-view
const stored = JSON.stringify(server)
assert.ok(!stored.includes(secretText))
assert.ok(!stored.includes(b64u(prfOutputA)) && !stored.includes(toHex(prfOutputA)))
console.log('Server stores:', JSON.stringify(server, null, 2))
// #endregion server-view

// --- Later sign-in on device A: the PRF output is obtained again and the note is decrypted ---
const signIn = async (credRandom, slot, extractable = false) => {
  const prfOutput = await authenticatorPrf(credRandom, await prfSalt(fromB64u(slot.prfInput)))
  return unwrapDataKey(slot, await deriveKek(prfOutput), wrapAad(userId, slot.credentialId), extractable)
}
const keyA = await signIn(hex(vector.authenticatorCredRandom), server.keySlots[0])
const decrypted = await decryptNote(keyA, userId, server.notes[0])
console.log(`Decrypt with passkey A: ${decrypted === secretText}`)
assert.equal(decrypted, secretText)

// --- A different passkey (not registered for this data) cannot unwrap the DEK ---
const credRandomB = hex('5f0a1c9e3b7d2468ace013579bdf2468ace013579bdf02468ace13579bdf0246')
const wrongPasskey = await rejects(signIn(credRandomB, server.keySlots[0]))
console.log(`Unwrap with unregistered passkey rejected: ${wrongPasskey}`)
assert.equal(wrongPasskey, true)

// --- Tampering: flipped ciphertext bit, and a ciphertext moved to another note ID ---
const flipped = fromB64u(server.notes[0].ciphertext)
flipped[0] ^= 1
const tampered = await rejects(decryptNote(keyA, userId, { ...server.notes[0], ciphertext: b64u(flipped) }))
console.log(`Changed ciphertext rejected: ${tampered}`)
assert.equal(tampered, true)
const moved = await rejects(decryptNote(keyA, userId, { ...server.notes[0], noteId: 'note-2' }))
console.log(`Ciphertext moved to another note rejected: ${moved}`)
assert.equal(moved, true)

// #region add-passkey
// Adding passkey B requires unlocking the DEK with an already registered passkey (A) first.
// The server alone cannot add a slot, because it never holds the DEK in plaintext.
const unlockedForRewrap = await signIn(hex(vector.authenticatorCredRandom), server.keySlots[0], true)
const credB = { credentialId: 'cred-B', prfInput: b64u(crypto.getRandomValues(new Uint8Array(32))) }
const prfOutputB = await authenticatorPrf(credRandomB, await prfSalt(fromB64u(credB.prfInput)))
server.keySlots.push({ ...credB, ...await wrapDataKey(unlockedForRewrap, await deriveKek(prfOutputB), wrapAad(userId, credB.credentialId)) })
// #endregion add-passkey
const keyB = await signIn(credRandomB, server.keySlots[1])
const decryptedB = await decryptNote(keyB, userId, server.notes[0])
console.log(`Decrypt with passkey B after adding a key slot: ${decryptedB === secretText}`)
assert.equal(decryptedB, secretText)

// --- A slot cannot be reused for another credential ID ---
const slotSwap = await rejects(unwrapDataKey(server.keySlots[1], await deriveKek(prfOutputB), wrapAad(userId, 'cred-A')))
console.log(`Key slot bound to another credential ID rejected: ${slotSwap}`)
assert.equal(slotSwap, true)

console.log('E2EE fixture checks passed: PRF test vector, key wrapping, decryption, tampering, and key slots.')
console.log('Not a WebAuthn RP: challenge, origin, RP ID, signature and UV are not verified here, and no browser or authenticator is used.')
