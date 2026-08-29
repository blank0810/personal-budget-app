/**
 * gauge-geometry.ts — arc maths for the reading gauge.
 *
 * A value maps onto a 220° sweep: theta(v) = 200° − 2.2°·v, so 0 sits
 * at 200° (lower left), 50 at 90° (top) and 100 at −20° (lower right).
 * SVG's y axis grows downward, hence `cy − r·sin`.
 *
 * Computed rather than hand-placed. The first pass at this drew the
 * coordinates by eye and shipped a needle pointing past the end of its
 * own filled arc, with tick marks off the circle.
 */
const CX = 100;
const CY = 100;
const R = 82;

const theta = (value: number) => 200 - 2.2 * value;

function point(deg: number, radius = R) {
	const rad = (deg * Math.PI) / 180;
	return {
		x: CX + radius * Math.cos(rad),
		y: CY - radius * Math.sin(rad),
	};
}

const fmt = (p: { x: number; y: number }) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

export const GAUGE = {
	viewBox: '0 0 200 146',
	centre: { cx: CX, cy: CY },
	/** Full 0→100 sweep. 220° > 180°, so the large-arc flag is set. */
	track: `M ${fmt(point(theta(0)))} A ${R} ${R} 0 1 1 ${fmt(point(theta(100)))}`,
	/** Filled portion for a value, and the needle's rotation in degrees. */
	fill(value: number) {
		const sweep = 2.2 * value;
		return `M ${fmt(point(theta(0)))} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${fmt(point(theta(value)))}`;
	},
	/** The needle is drawn pointing up (90°), so rotate by the difference. */
	needleRotation: (value: number) => 90 - theta(value),
	ticks: [0, 25, 50, 75, 100].map((v) => {
		const inner = point(theta(v), R - 9);
		const outer = point(theta(v));
		return { x1: +inner.x.toFixed(1), y1: +inner.y.toFixed(1), x2: +outer.x.toFixed(1), y2: +outer.y.toFixed(1) };
	}),
};
