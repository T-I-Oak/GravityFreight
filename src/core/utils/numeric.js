export const LOGIC_DECIMAL_PLACES = 4;

export function normalizeLogicNumber(value, decimalPlaces = LOGIC_DECIMAL_PLACES) {
    if (!Number.isFinite(value)) {
        return value;
    }

    const scale = 10 ** decimalPlaces;
    return Math.round(value * scale) / scale;
}
