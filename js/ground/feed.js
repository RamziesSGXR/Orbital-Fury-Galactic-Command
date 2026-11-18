// Galactic Command: Orbital Fury's community feed (posts to a Discord channel) is not part of this game. Nothing is sent.
export function feedOn() { return false; }
export function feedEnd() { /* nothing is posted */ }
export const FB_MAX = 900;
export function feedbackCan() { return false; }
export function feedFeedback() { return Promise.resolve({ ok: false, reason: 'off' }); }
