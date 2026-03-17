/**
 * Shared mobile detection utility for CineRooms.
 * CineRooms is a desktop-only application — this helper is used everywhere
 * to gate mobile users out consistently.
 */
export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
