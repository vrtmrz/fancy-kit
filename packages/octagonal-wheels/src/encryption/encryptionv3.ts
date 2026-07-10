import { arrayBufferToBase64Single, base64ToArrayBuffer, readString, writeString } from "../binary/base64.ts";
import { hexStringToUint8Array, uint8ArrayToHexString } from "../binary/hex.ts";

const webcrypto = globalThis.crypto;
const SALT_STR = "fancySyncForYou!";
const SALT = new TextEncoder().encode(SALT_STR);

let previousPassphrase = "";
let encryptionKey: CryptoKey;

/**
 * Resets the IV buffer and generates a new random value for encryption.
 * IV consists of 4 bytes of nonce after 8 bytes of random value.
 */
function resetV3Buf() {
    _nonceV3[0] = 0;
    const _wk = webcrypto.getRandomValues(new Uint8Array(12));
    bufV3.set(_wk);
    bufV3.set(_nonceV3, 8);
}
// return webcrypto.getRandomValues(new Uint8Array(8));

const _nonceV3 = new Uint32Array(1);
const bufV3 = new Uint8Array(12);
/**
 * Increments the initialization vector (IV) used for encryption.
 *
 * @returns {Buffer} The updated IV buffer.
 */
function incIV() {
    _nonceV3[0]++;
    bufV3.set(_nonceV3, 8);
    // reset the IV after every 1500 encryptions.
    if (_nonceV3[0] > 1500) {
        resetV3Buf();
    }
    return bufV3;
}

/**
 * Generates a key using the passphrase.
 *
 * @param passphrase - The passphrase used for generating the key.
 * @returns The derived key.
 * @deprecated Use `hkdf` instead.
 */
export async function generateKey(passphrase: string): Promise<CryptoKey> {
    const passphraseBin = new TextEncoder().encode(passphrase);
    const digestOfPassphrase = await webcrypto.subtle.digest("SHA-256", new Uint8Array([...passphraseBin, ...SALT]));
    const salt = digestOfPassphrase.slice(0, 16);
    const baseKey = await webcrypto.subtle.importKey("raw", passphraseBin, "PBKDF2", false, [
        "deriveBits",
        "deriveKey",
    ]);

    const pbkdf2Params = {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: salt,
        iterations: 100000, // Increased iterations for better security
    };

    const derivedKey = await webcrypto.subtle.deriveKey(
        pbkdf2Params,
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt", "encrypt"]
    );
    return derivedKey;
}

/**
 * Encrypts the input string using AES-GCM encryption algorithm with the provided passphrase.
 *
 * @param input - The string to be encrypted.
 * @param passphrase - The passphrase used for encryption.
 * @returns The encrypted string with the initialization vector (IV) prepended.
 * @remarks The salt is fixed and is not changed for every encryption due to performance reasons.
 * ~~This function is still experimental and not guaranteed to be safe~~ Now deprecated. Not safe.
 * @deprecated Use `hkdf` instead.
 */
export async function encryptV3(input: string, passphrase: string) {
    if (previousPassphrase !== passphrase) {
        resetV3Buf();
        const key = await generateKey(passphrase);
        encryptionKey = key;
        previousPassphrase = passphrase;
    }

    const iv = incIV();
    const dataBuf = writeString(input);

    const encryptedDataArrayBuffer = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, encryptionKey, dataBuf);
    const encryptedData2 = "" + (await arrayBufferToBase64Single(new Uint8Array(encryptedDataArrayBuffer)));
    // return data with iv.
    // |%~| iv(12) | data ....
    const ret = `%~${uint8ArrayToHexString(iv)}${encryptedData2}`;
    return ret;
}

let previousDecryptionPassphrase = "";
let decryptionKey: CryptoKey;

/**
 * Decrypts the encrypted result using the provided passphrase.
 *
 * @param encryptedResult - The encrypted result to be decrypted.
 * @param passphrase - The passphrase used for decryption.
 * @returns The decrypted plain text.
 * @remarks The salt is fixed and is not changed for every encryption due to performance reasons.
 * ~~This function is still experimental and not guaranteed to be safe~~ Now deprecated.
 * @deprecated Use `hkdf` instead. Only decryption will permitted in the future.
 */
export async function decryptV3(encryptedResult: string, passphrase: string) {
    if (previousDecryptionPassphrase !== passphrase) {
        const key = await generateKey(passphrase);
        decryptionKey = key;
        previousDecryptionPassphrase = passphrase;
    }
    const ivStr = encryptedResult.substring(2, 26);
    const encryptedData = encryptedResult.substring(26);
    const iv = hexStringToUint8Array(ivStr);
    const encryptedDataArrayBuffer = base64ToArrayBuffer(encryptedData);
    const dataBuffer = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, decryptionKey, encryptedDataArrayBuffer);
    const plain = readString(new Uint8Array(dataBuffer));
    return plain;
}
