/**
 * One replayed session, shared by every hero-visual option so the three
 * candidates differ in presentation and not in data.
 *
 * Hand-tuned to read as a plausible session: a drift down, a base, then the
 * move the simulated trade is positioned for. Coordinates are viewBox units,
 * y inverted as SVG expects (smaller y = higher price).
 */
export interface Candle {
	x: number;
	o: number;
	c: number;
	l: number;
	h: number;
}

export const CANDLES: Candle[] = [
	{ x: 14, o: 104, c: 96, l: 92, h: 108 },
	{ x: 30, o: 96, c: 103, l: 93, h: 106 },
	{ x: 46, o: 103, c: 90, l: 86, h: 105 },
	{ x: 62, o: 90, c: 82, l: 78, h: 93 },
	{ x: 78, o: 82, c: 89, l: 79, h: 92 },
	{ x: 94, o: 89, c: 76, l: 72, h: 91 },
	{ x: 110, o: 76, c: 68, l: 63, h: 79 },
	{ x: 126, o: 68, c: 75, l: 65, h: 78 },
	{ x: 142, o: 75, c: 64, l: 59, h: 77 },
	{ x: 158, o: 64, c: 70, l: 61, h: 73 },
	{ x: 174, o: 70, c: 62, l: 57, h: 72 },
	{ x: 190, o: 62, c: 66, l: 59, h: 69 },
];

/** Candles to the right of the playhead: not yet replayed. */
export const GHOSTS: Candle[] = [
	{ x: 218, o: 66, c: 58, l: 54, h: 68 },
	{ x: 234, o: 58, c: 63, l: 55, h: 66 },
	{ x: 250, o: 63, c: 52, l: 48, h: 65 },
	{ x: 266, o: 52, c: 57, l: 49, h: 60 },
	{ x: 282, o: 57, c: 46, l: 42, h: 59 },
];

export const PLAYHEAD_X = 206;

/** The simulated trade: long from ENTRY, protected at STOP, aiming at TARGET. */
export const TRADE = {
	entry: 66,
	stop: 84,
	target: 34,
	fromX: 190,
} as const;

export const BODY_W = 9;

export function bodyRect(candle: Candle) {
	return {
		y: Math.min(candle.o, candle.c),
		height: Math.max(Math.abs(candle.o - candle.c), 2),
	};
}

export function isUp(candle: Candle): boolean {
	// y is inverted: a close above the open means a smaller y.
	return candle.c <= candle.o;
}
