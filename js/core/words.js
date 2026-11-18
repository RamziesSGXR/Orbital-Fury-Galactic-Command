// With a mouse you click; on a touch screen you tap. Text is written with "tap" and read through this.
const FINE = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
export const words = (s) => (FINE ? s.replace(/\bTap\b/g, 'Click').replace(/\btap\b/g, 'click').replace(/\bTAP\b/g, 'CLICK') : s);
