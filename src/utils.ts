
export function hexNumber(hex: string): number {
    return parseInt(hex.replace("#", "0x"), 16);
}
