/**
 * Helper functions for asymmetric encryption and decryption of configuration data.
 * Please refer to the header documentation of `asymmetric.ts` for more details.
 */
import { arrayBufferToBase64Single, writeString } from "../../binary/base64.ts";
import { encryptUInt8ArrayWithPublicKey } from "./asymmetric.ts";
import { decryptUInt8ArrayWithPrivateKey } from "./asymmetric.ts";
import { decryptUInt8Array, encryptUInt8Array } from "./asymmetric.ts";
import { AsymmetricDecryptionError, AsymmetricEncryptionArgumentError } from "./common.ts";

/**
 * Encrypts configuration data using a hybrid method of RSA-OAEP and AES-GCM.
 * @param configData The configuration data to be encrypted (JSON object).
 * @param publicKey The public key to use for encryption.
 * @returns The encrypted data, encoded as a Base64 string.
 */
export async function encryptConfig(configData: object, publicKey: CryptoKey): Promise<string> {
    const dataBuffer = writeString(JSON.stringify(configData)); // Convert configuration object to JSON string and then to UTF-8 byte array

    let encryptedResult: Uint8Array<ArrayBuffer>;
    if (publicKey.algorithm.name === "RSA-OAEP") {
        encryptedResult = await encryptUInt8Array(dataBuffer, publicKey);
    } else if (publicKey.algorithm.name === "ECDH") {
        encryptedResult = await encryptUInt8ArrayWithPublicKey(dataBuffer, publicKey);
    } else {
        throw new AsymmetricEncryptionArgumentError(`Unsupported public key algorithm`, publicKey.algorithm.name);
    }

    const strEncryptedData = arrayBufferToBase64Single(encryptedResult); // Convert the encrypted Uint8Array to a Base64 string
    return strEncryptedData;
}

/**
 * Decrypts configuration data that was encrypted using the hybrid method of RSA-OAEP and AES-GCM.
 * @param encryptedInfo The encrypted data (Uint8Array).
 * @param privateKey The private key to use for decryption.
 * @returns The decrypted configuration data (JSON object).
 * @throws Error if decryption fails or if JSON parsing fails.
 */
export async function decryptConfig(encryptedInfo: Uint8Array, privateKey: CryptoKey): Promise<object> {
    let decryptedData: Uint8Array;
    if (privateKey.algorithm.name === "RSA-OAEP") {
        decryptedData = await decryptUInt8Array(encryptedInfo, privateKey);
    } else if (privateKey.algorithm.name === "ECDH") {
        decryptedData = await decryptUInt8ArrayWithPrivateKey(encryptedInfo, privateKey);
    } else {
        throw new AsymmetricEncryptionArgumentError(`Unsupported private key algorithm`, privateKey.algorithm.name);
    }
    const decoder = new TextDecoder();

    try {
        // Convert the byte array to a UTF-8 string
        // Parse the JSON string to an object
        const decryptedConfigJson = decoder.decode(decryptedData); // Convert byte array to UTF-8 string
        return JSON.parse(decryptedConfigJson); // Parse JSON string to object
    } catch (error) {
        throw new AsymmetricDecryptionError(`Failed to parse decrypted data as JSON`, error);
    }
}
