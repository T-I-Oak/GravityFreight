export const DELIVERY_CARGO_ICON_VIEWBOX = {
    width: 45,
    height: 31.5
};

export const DELIVERY_CARGO_ICON_PATHS = {
    outline: [
        [30, 0],
        [0, 4.5],
        [0, 22.5],
        [15, 31.5],
        [45, 27],
        [45, 9],
        [30, 0]
    ],
    tapeLeft: [
        [15, 13.5],
        [0, 4.5]
    ],
    tapeRight: [
        [15, 13.5],
        [45, 9]
    ],
    seam: [
        [15, 13.5],
        [15, 31.5]
    ],
    lid: [
        [7.5, 9],
        [37.5, 6.75]
    ]
};

export function generateDeliveryCargoIconSVG(className = '') {
    const classAttribute = className ? ` class="${className}"` : '';
    const paths = Object.values(DELIVERY_CARGO_ICON_PATHS)
        .map(points => `<polyline points="${points.map(point => point.join(',')).join(' ')}"></polyline>`)
        .join('');

    return `<svg${classAttribute} viewBox="0 0 ${DELIVERY_CARGO_ICON_VIEWBOX.width} ${DELIVERY_CARGO_ICON_VIEWBOX.height}" aria-hidden="true" focusable="false">${paths}</svg>`;
}
