import type { VariantId } from '../../lib/variants';

import { discipline } from './discipline';
import { money } from './money';
import { time } from './time';
import type { VariantCopy } from './types';

/**
 * The record is keyed by VariantId, so adding an arm to VARIANT_IDS without
 * writing its copy is a type error rather than a blank page in one third of
 * sessions.
 */
export const VARIANT_COPY: Record<VariantId, VariantCopy> = {
	money,
	time,
	discipline,
};

export function getVariantCopy(variant: VariantId): VariantCopy {
	return VARIANT_COPY[variant];
}

export type { VariantCopy };
