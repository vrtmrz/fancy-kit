import { writeString, arrayBufferToBase64Single } from '../binary/base64.js';
import { uint8ArrayToHexString } from '../binary/hex.js';

const webcrypto = globalThis.crypto;
/**
 * Obfuscates the given path using AES-GCM encryption. This obfuscation is deterministic.
 * @param path - The path to obfuscate.
 * @param passphrase - The passphrase used for encryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations.
 * @returns The obfuscated path: |%| iv(32) | salt(32) | data ....
 */
async function obfuscatePath(path, passphrase, autoCalculateIterations) {
    const dataBuf = writeString(path);
    const [key, salt, iv] = await getKeyForObfuscatePath(passphrase, dataBuf, autoCalculateIterations);
    const encryptedDataArrayBuffer = await webcrypto.subtle.encrypt({
        name: "AES-GCM",
        iv: iv,
    }, key, dataBuf);
    const encryptedData2 = await arrayBufferToBase64Single(new Uint8Array(encryptedDataArrayBuffer));
    // return data with iv and salt.
    // |%| iv(32) | salt(32) | data ....
    const ret = `%${uint8ArrayToHexString(iv)}${uint8ArrayToHexString(salt)}${encryptedData2}`;
    return ret;
} /**
 * Checks if a given path is probably obfuscated.
 *
 * @param path - The path to check.
 * @returns `true` if the path is probably obfuscated, `false` otherwise.
 */
function isPathProbablyObfuscated(path) {
    return path.startsWith("%") && path.length > 64;
}
/**
 * Generates a key, salt, and IV for obfuscating a path using the provided passphrase.
 * @param passphrase - The passphrase used for key generation.
 * @param dataBuf - The data buffer to be used in key derivation.
 * @param autoCalculateIterations - A flag indicating whether to automatically calculate the number of iterations based on the passphrase length.
 * @returns A promise that resolves to an array containing the generated key, salt, and IV.
 */
async function getKeyForObfuscatePath(passphrase, dataBuf, autoCalculateIterations) {
    const passphraseLen = 15 - passphrase.length;
    const iteration = autoCalculateIterations
        ? (passphraseLen > 0 ? passphraseLen : 0) * 1000 + 121 - passphraseLen
        : 100000;
    const passphraseBin = new TextEncoder().encode(passphrase);
    const digest = await webcrypto.subtle.digest({ name: "SHA-256" }, passphraseBin);
    const buf2 = new Uint8Array(await webcrypto.subtle.digest({ name: "SHA-256" }, new Uint8Array([...dataBuf, ...passphraseBin])));
    const salt = buf2.slice(0, 16);
    const iv = buf2.slice(16, 32);
    const keyMaterial = await webcrypto.subtle.importKey("raw", digest, { name: "PBKDF2" }, false, ["deriveKey"]);
    const key = await webcrypto.subtle.deriveKey({
        name: "PBKDF2",
        salt,
        iterations: iteration,
        hash: "SHA-256",
    }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    return [key, salt, iv];
}

export { getKeyForObfuscatePath, isPathProbablyObfuscated, obfuscatePath };
//# sourceMappingURL=obfuscatePath.js.map
