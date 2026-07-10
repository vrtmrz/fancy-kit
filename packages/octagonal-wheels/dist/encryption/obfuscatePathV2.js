import { writeString, arrayBufferToBase64Single } from '../binary/base64.js';
import { uint8ArrayToHexString } from '../binary/hex.js';
import { memoWithMap } from '../memory/memo.js';

// Deterministic path obfuscation using HKDF
// ObfuscatePathV2 is not a replacement for ObfuscatePath, but rather a new method that uses HKDF for key derivation and HMAC for path hashing.
// But, it cannot be used to decrypt the path back to its original form.
//
/**
 * As `\\` cannot be used on Windows, and `/` cannot be used on Mac or Linux, a prefix containing both is used.
 * @internal
 */
const pathPrefixMark = "%/\\";
/**
 * Determines whether the path is likely to be obfuscated using the V2 method.
 * @param path The path string to be checked
 * @returns True if the path is obfuscated, otherwise false
 */
function isPathProbablyObfuscatedV2(path) {
    // A simple heuristic is used to determine whether a path is likely to be obfuscated
    return path.startsWith(pathPrefixMark);
}
const webcrypto = globalThis.crypto;
/**
 * Derives a key from the passphrase and HKDF salt.
 * @param passphrase The passphrase
 * @param hkdfSalt The salt for HKDF
 * @returns The derived key (returned as a Promise)
 * @internal
 */
async function _deriveKeyFromPassphrase(passphrase, hkdfSalt) {
    const passphraseBin = writeString(passphrase);
    const keyMaterial = await webcrypto.subtle.importKey("raw", passphraseBin, { name: "HKDF" }, false, ["deriveKey"]);
    const derivedKey = await webcrypto.subtle.deriveKey({
        name: "HKDF",
        hash: "SHA-256",
        salt: hkdfSalt,
        info: new Uint8Array([]),
    }, keyMaterial, { name: "HMAC", hash: "SHA-256", length: 256 }, false, ["sign"]);
    return derivedKey;
}
/**
 * Key derivation from the combination of passphrase and salt is memoised.
 * @internal
 */
const deriveKeyFromPassphrase = memoWithMap(10, _deriveKeyFromPassphrase, ([passphrase, hkdfSalt]) => {
    return `${writeString(passphrase)}-${uint8ArrayToHexString(hkdfSalt)}`;
});
/**
 * Obfuscates a path using the V2 method.
 * If the path is already obfuscated, it is returned as is.
 *
 * 1. A key is derived from the passphrase and salt using HKDF.
 * 2. The path is hashed using HMAC.
 * 3. The result is encoded using base64url.
 * 4. The prefix is added and the result is returned.
 *
 * @param path The path to be obfuscated
 * @param passphrase The passphrase
 * @param hkdfSalt The salt for HKDF
 * @returns The obfuscated path (returned as a Promise)
 */
async function obfuscatePathV2(path, passphrase, hkdfSalt) {
    if (isPathProbablyObfuscatedV2(path)) {
        // If the path appears to be already obfuscated, it is returned as is
        return path;
    }
    const pathBin = writeString(path);
    // 1. Key derivation: A key is generated from the passphrase and salt using HKDF
    const derivedKey = await deriveKeyFromPassphrase(passphrase, hkdfSalt);
    // 2. The path is hashed using HMAC
    const hmac = await webcrypto.subtle.sign("HMAC", derivedKey, pathBin);
    // 3. The result is encoded using base64url
    const base64url = await arrayBufferToBase64Single(new Uint8Array(hmac));
    // 4. The prefix is added and the result is returned
    return `${pathPrefixMark}${base64url}`;
}

export { isPathProbablyObfuscatedV2, obfuscatePathV2 };
//# sourceMappingURL=obfuscatePathV2.js.map
