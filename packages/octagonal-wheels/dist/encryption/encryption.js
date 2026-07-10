import { decodeBinary } from '../binary/index.js';
import { readString, writeString, arrayBufferToBase64Single } from '../binary/base64.js';
import { hexStringToUint8Array, uint8ArrayToHexString } from '../binary/hex.js';
import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';
import { decryptV3, encryptV3 } from './encryptionv3.js';
import { testEncryptionFeature } from './hkdf.js';
export { isPathProbablyObfuscated, obfuscatePath } from './obfuscatePath.js';

const ENCRYPT_V1_PREFIX_PROBABLY = "[";
const ENCRYPT_V2_PREFIX = "%";
const ENCRYPT_V3_PREFIX = "%~";
const KeyBuffs = new Map();
const decKeyBuffs = new Map();
const KEY_RECYCLE_COUNT = 100;
let semiStaticFieldBuffer;
const nonceBuffer = new Uint32Array(1);
const webcrypto = globalThis.crypto;
/**
 * Retrieves the encryption key and salt for encrypting data using the provided passphrase.
 * @param passphrase - The passphrase used to derive the encryption key.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the number of iterations based on the passphrase length.
 * @returns A Promise that resolves to an array containing the encryption key and salt.
 */
async function getKeyForEncrypt(passphrase, autoCalculateIterations) {
    // For performance, the plugin reuses the key KEY_RECYCLE_COUNT times.
    const buffKey = `${passphrase}-${autoCalculateIterations}`;
    const f = KeyBuffs.get(buffKey);
    if (f) {
        f.count--;
        if (f.count > 0) {
            return [f.key, f.salt];
        }
        f.count--;
    }
    const passphraseLen = 15 - passphrase.length;
    const iteration = autoCalculateIterations
        ? (passphraseLen > 0 ? passphraseLen : 0) * 1000 + 121 - passphraseLen
        : 100000;
    const passphraseBin = new TextEncoder().encode(passphrase);
    const digest = await webcrypto.subtle.digest({ name: "SHA-256" }, passphraseBin);
    const keyMaterial = await webcrypto.subtle.importKey("raw", digest, { name: "PBKDF2" }, false, ["deriveKey"]);
    const salt = webcrypto.getRandomValues(new Uint8Array(16));
    const key = await webcrypto.subtle.deriveKey({
        name: "PBKDF2",
        salt,
        iterations: iteration,
        hash: "SHA-256",
    }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    KeyBuffs.set(buffKey, {
        key,
        salt,
        count: KEY_RECYCLE_COUNT,
    });
    return [key, salt];
}
let keyGCCount = KEY_RECYCLE_COUNT * 5;
let decKeyIdx = 0;
let decKeyMin = 0;
/**
 * Retrieves the encryption key for decryption.
 *
 * @param passphrase - The passphrase used for encryption.
 * @param salt - The salt value used for encryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iteration count.
 * @returns A promise that resolves to a tuple containing the encryption key and the salt value.
 */
async function getKeyForDecryption(passphrase, salt, autoCalculateIterations) {
    keyGCCount--;
    if (keyGCCount < 0) {
        keyGCCount = KEY_RECYCLE_COUNT;
        // drop 50% of cache.
        const threshold = (decKeyIdx - decKeyMin) / 2;
        for (const [key, buff] of decKeyBuffs) {
            if (buff.count < threshold) {
                decKeyBuffs.delete(key);
            }
            decKeyMin = decKeyIdx;
        }
    }
    decKeyIdx++;
    const bufKey = passphrase + uint8ArrayToHexString(salt) + autoCalculateIterations;
    const f = decKeyBuffs.get(bufKey);
    if (f) {
        f.count = decKeyIdx;
        return [f.key, f.salt];
    }
    const passphraseLen = 15 - passphrase.length;
    const iteration = autoCalculateIterations
        ? (passphraseLen > 0 ? passphraseLen : 0) * 1000 + 121 - passphraseLen
        : 100000;
    const passphraseBin = new TextEncoder().encode(passphrase);
    const digest = await webcrypto.subtle.digest({ name: "SHA-256" }, passphraseBin);
    const keyMaterial = await webcrypto.subtle.importKey("raw", digest, { name: "PBKDF2" }, false, ["deriveKey"]);
    const key = await webcrypto.subtle.deriveKey({
        name: "PBKDF2",
        salt,
        iterations: iteration,
        hash: "SHA-256",
    }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    decKeyBuffs.set(bufKey, {
        key,
        salt,
        count: 0,
    });
    return [key, salt];
}
/**
 * Retrieves the semi-static field used for encryption.
 *
 * @param reset - Optional parameter to reset the field.
 * @returns The semi-static field.
 */
function getSemiStaticField(reset) {
    // return fixed field of iv.
    if (semiStaticFieldBuffer != null && !reset) {
        return semiStaticFieldBuffer;
    }
    semiStaticFieldBuffer = webcrypto.getRandomValues(new Uint8Array(12));
    return semiStaticFieldBuffer;
}
/**
 * Generates a nonce for encryption.
 *
 * @returns The generated nonce.
 */
function getNonce() {
    // This is nonce, so do not send same thing.
    nonceBuffer[0]++;
    if (nonceBuffer[0] > 10000) {
        // reset semi-static field.
        getSemiStaticField(true);
    }
    return nonceBuffer;
}
/**
 * Encrypts the input string using AES-GCM encryption algorithm.
 * @param input - The string to be encrypted.
 * @param passphrase - The passphrase used for encryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations for key derivation.
 * @returns A string representing the encrypted data, initialization vector (IV), and salt in JSON format.
 * @deprecated Use `hkdf` instead.
 */
async function encryptV1(input, passphrase, autoCalculateIterations) {
    const [key, salt] = await getKeyForEncrypt(passphrase, autoCalculateIterations);
    // Create initial vector with semi-fixed part and incremental part
    // I think it's not good against related-key attacks.
    const fixedPart = getSemiStaticField();
    const invocationPart = getNonce();
    const iv = new Uint8Array([...fixedPart, ...new Uint8Array(invocationPart.buffer)]);
    const plainStringified = JSON.stringify(input);
    const plainStringBuffer = writeString(plainStringified);
    const encryptedDataArrayBuffer = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plainStringBuffer);
    const encryptedData2 = await arrayBufferToBase64Single(encryptedDataArrayBuffer);
    const ret = `["${encryptedData2}","${uint8ArrayToHexString(iv)}","${uint8ArrayToHexString(salt)}"]`;
    return ret;
}
/**
 * Encrypts the input string using AES-GCM encryption algorithm.
 *
 * @param input - The string to be encrypted.
 * @param passphrase - The passphrase used for encryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations for key derivation.
 * @returns The encrypted data with initialization vector (iv) and salt. <br>  |%| iv(32) | salt(32) | data ....
 * @deprecated Use `hkdf` instead.
 */
async function encrypt(input, passphrase, autoCalculateIterations) {
    const [key, salt] = await getKeyForEncrypt(passphrase, autoCalculateIterations);
    // Create initial vector with semi-fixed part and incremental part
    // I think it's not good against related-key attacks.
    const fixedPart = getSemiStaticField();
    const invocationPart = getNonce();
    const iv = new Uint8Array([...fixedPart, ...new Uint8Array(invocationPart.buffer)]);
    const dataBuf = writeString(input);
    const encryptedDataArrayBuffer = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, dataBuf);
    const encryptedData2 = "" + (await arrayBufferToBase64Single(new Uint8Array(encryptedDataArrayBuffer)));
    // return data with iv and salt.
    // |%| iv(32) | salt(32) | data ....
    const ret = `%${uint8ArrayToHexString(iv)}${uint8ArrayToHexString(salt)}${encryptedData2}`;
    return ret;
}
/**
 * Decrypts the encrypted result using the provided passphrase and returns the decrypted string.
 * @param encryptedResult - The encrypted result to decrypt.
 * @param passphrase - The passphrase used for decryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations for key derivation.
 * @returns A Promise that resolves to the decrypted string.
 * @throws If decryption fails or an error occurs during the decryption process.
 * @deprecated Use `hkdf` instead.
 */
async function decryptV2(encryptedResult, passphrase, autoCalculateIterations) {
    try {
        const ivStr = encryptedResult.substring(1, 33);
        const salt = encryptedResult.substring(33, 65);
        const encryptedData = encryptedResult.substring(65);
        const [key] = await getKeyForDecryption(passphrase, hexStringToUint8Array(salt), autoCalculateIterations);
        const iv = hexStringToUint8Array(ivStr);
        const encryptedDataArrayBuffer = decodeBinary(encryptedData);
        const dataBuffer = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedDataArrayBuffer);
        const plain = readString(new Uint8Array(dataBuffer));
        return plain;
    }
    catch (ex) {
        Logger("Couldn't decode! You should wrong the passphrases (V2)", LOG_LEVEL_VERBOSE);
        Logger(ex, LOG_LEVEL_VERBOSE);
        throw ex;
    }
}
/**
 * Decrypts the encrypted result using the provided passphrase.
 * @param encryptedResult - The encrypted result to decrypt.
 * @param passphrase - The passphrase used for decryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations.
 * @returns A Promise that resolves to the decrypted string.
 * @throws If the encrypted data is corrupted or if decryption fails.
 * @deprecated Use `hkdf` instead.
 */
async function decrypt(encryptedResult, passphrase, autoCalculateIterations) {
    try {
        if (encryptedResult[0] == "%") {
            if (encryptedResult[1] === "~") {
                return decryptV3(encryptedResult, passphrase);
            }
            return decryptV2(encryptedResult, passphrase, autoCalculateIterations);
        }
        if (!encryptedResult.startsWith("[") || !encryptedResult.endsWith("]")) {
            throw new Error("Encrypted data corrupted!");
        }
        const w = encryptedResult
            .substring(1, encryptedResult.length - 1)
            .split(",")
            .map((e) => (e[0] == '"' ? e.substring(1, e.length - 1) : e));
        const [encryptedData, ivString, salt] = w;
        const [key] = await getKeyForDecryption(passphrase, hexStringToUint8Array(salt), autoCalculateIterations);
        const iv = hexStringToUint8Array(ivString);
        // decode base 64, it should increase speed and i should with in MAX_DOC_SIZE_BIN, so it won't OOM.
        const encryptedDataBin = atob(encryptedData);
        const len = encryptedDataBin.length;
        const encryptedDataArrayBuffer = new Uint8Array(len);
        // converting binary string to arraybuffer
        for (let i = len; i >= 0; --i) {
            encryptedDataArrayBuffer[i] = encryptedDataBin.charCodeAt(i);
        }
        const plainStringBuffer = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedDataArrayBuffer);
        const plainStringified = readString(new Uint8Array(plainStringBuffer));
        const plain = JSON.parse(plainStringified);
        return plain;
    }
    catch (ex) {
        Logger("Couldn't decode! You should wrong the passphrases", LOG_LEVEL_VERBOSE);
        Logger(ex, LOG_LEVEL_VERBOSE);
        throw ex;
    }
}
/**
 * Tries to decrypt the encrypted result using the provided passphrase.
 *
 * @param encryptedResult - The encrypted result to decrypt.
 * @param passphrase - The passphrase used for decryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations.
 * @returns A promise that resolves to the decrypted result if successful, or `false` if decryption fails.
 * @deprecated Use `hkdf` instead.
 */
async function tryDecrypt(encryptedResult, passphrase, autoCalculateIterations) {
    if (!passphrase)
        return false;
    try {
        return await decrypt(encryptedResult, passphrase, autoCalculateIterations);
    }
    catch {
        return false;
    }
}
/**
 * @deprecated Use `hkdf` instead.
 */
async function testCryptV3() {
    const src = "✨supercalifragilisticexpialidocious✨⛰️";
    const encoded = await encryptV3(src, "passwordTest");
    const decrypted = await decrypt(encoded, "passwordTest", false);
    if (src != decrypted) {
        Logger("WARNING! Your device would not support encryption V3.", LOG_LEVEL_VERBOSE);
        return false;
    }
    else {
        Logger("CRYPT LOGIC (V3) OK", LOG_LEVEL_VERBOSE);
        return true;
    }
}
/**
 * Tests the encryption and decryption functionality.
 * @deprecated Use `hkdf.testEncryptionFeature` instead.
 * @returns {Promise<boolean>} A promise that resolves to `true` if encryption and decryption are successful, and `false` otherwise.
 */
async function testCrypt() {
    const src = "✨supercalifragilisticexpialidocious✨⛰️";
    const encoded = await encrypt(src, "passwordTest", false);
    const decrypted = await decrypt(encoded, "passwordTest", false);
    if (src != decrypted) {
        Logger("WARNING! Your device would not support encryption.", LOG_LEVEL_VERBOSE);
        return false;
    }
    else {
        Logger("CRYPT LOGIC OK", LOG_LEVEL_VERBOSE);
        const w = writeString(src);
        const encodedBinary = await encryptBinary(w, "passwordTest", false);
        const decryptedBinary = await decryptBinary(encodedBinary, "passwordTest", false);
        if (w.join("-") !== decryptedBinary.join("-")) {
            Logger("WARNING! Your device would not support encryption (Binary).", LOG_LEVEL_VERBOSE);
            return false;
        }
        else {
            Logger("CRYPT LOGIC OK (Binary)", LOG_LEVEL_VERBOSE);
        }
        return (await testCryptV3()) && (await testEncryptionFeature());
    }
}
/**
 * Encrypts binary data using AES-GCM encryption algorithm.
 *
 * @param input - The binary data to be encrypted.
 * @param passphrase - The passphrase used to derive the encryption key.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the number of iterations for key derivation.
 * @returns The encrypted binary data.
 */
async function encryptBinary(input, passphrase, autoCalculateIterations) {
    const [key, salt] = await getKeyForEncrypt(passphrase, autoCalculateIterations);
    // Create initial vector with semi-fixed part and incremental part
    // I think it's not good against related-key attacks.
    const fixedPart = getSemiStaticField();
    const invocationPart = getNonce();
    const iv = new Uint8Array([...fixedPart, ...new Uint8Array(invocationPart.buffer)]);
    const dataBuf = input;
    const encryptedDataArrayBuffer = new Uint8Array(await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, dataBuf));
    const ret = new Uint8Array(encryptedDataArrayBuffer.byteLength + iv.byteLength + salt.byteLength);
    ret.set(iv, 0);
    ret.set(salt, iv.byteLength);
    ret.set(encryptedDataArrayBuffer, iv.byteLength + salt.byteLength);
    return ret;
}
/**
 * Decrypts the encrypted binary data using the provided passphrase.
 * @param encryptedResult - The encrypted binary data as a Uint8Array.
 * @param passphrase - The passphrase used for decryption.
 * @param autoCalculateIterations - A boolean indicating whether to automatically calculate the iterations for key derivation.
 * @returns A Promise that resolves to the decrypted binary data as a Uint8Array.
 * @throws If decryption fails or an error occurs during the decryption process.
 */
async function decryptBinary(encryptedResult, passphrase, autoCalculateIterations) {
    try {
        const iv = encryptedResult.slice(0, 16);
        const salt = encryptedResult.slice(16, 32);
        const encryptedData = encryptedResult.slice(32);
        const [key] = await getKeyForDecryption(passphrase, salt, autoCalculateIterations);
        const dataBuffer = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedData);
        return new Uint8Array(dataBuffer);
    }
    catch (ex) {
        Logger("Couldn't decode! You should wrong the passphrases (V2 Bin)", LOG_LEVEL_VERBOSE);
        Logger(ex, LOG_LEVEL_VERBOSE);
        throw ex;
    }
}

export { ENCRYPT_V1_PREFIX_PROBABLY, ENCRYPT_V2_PREFIX, ENCRYPT_V3_PREFIX, decrypt, decryptBinary, encrypt, encryptBinary, encryptV1, testCrypt, testCryptV3, tryDecrypt };
//# sourceMappingURL=encryption.js.map
