/**
 * Masks an email for display.
 *
 * Applied on the server before render, so the full address never reaches the
 * DOM — not hidden with CSS, not truncated in the browser. Someone with the
 * dashboard open in a meeting, or a screenshot of it, does not leak a customer
 * list (D38).
 */
export function maskEmail(email: string | null): string {
	if (!email) return '—';
	const at = email.lastIndexOf('@');
	if (at <= 0) return '•••';

	const local = email.slice(0, at);
	const domain = email.slice(at + 1);
	// Fixed width, not `local.length - 1`: a variable run of asterisks leaks
	// how long the address is, which is a little more than nothing about a
	// person. One leading character is enough to recognise your own address in
	// a support conversation and not enough to reconstruct someone else's.
	return `${local[0]}****@${domain}`;
}
