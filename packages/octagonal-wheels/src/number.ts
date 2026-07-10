/**
 * Converts a size in bytes to a human-readable format.
 * @param size - The size in bytes.
 * @returns A string representing the human-readable size with 2 decimal places.
 */
export function sizeToHumanReadable(size: number) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (size >= 1024 && i < units.length) {
        size /= 1024;
        i++;
    }
    return size.toFixed(2) + units[i];
}
