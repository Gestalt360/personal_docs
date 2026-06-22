import React, { useRef, useState, useCallback } from 'react';
import { useNoteStore } from '../store/noteStore';

/**
 * Simple Pull‑to‑Refresh wrapper for mobile.
 * It detects a vertical drag from the top and triggers the supplied
 * `onRefresh` callback when the drag exceeds a threshold.
 */
export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const { loadNotes } = useNoteStore();
  const startY = useRef(0);
  const [pullDist, setPullDist] = useState(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pulling.current = true;
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      // Pull down – limit to 120px for visual feedback
      setPullDist(Math.min(dy, 120));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pulling.current && pullDist > 80) {
      // Trigger a refresh if pulled far enough
      loadNotes();
    }
    // Reset UI
    setPullDist(0);
    pulling.current = false;
  }, [pullDist, loadNotes]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Visual indicator */}
      <div
        className="flex items-center justify-center text-sm text-gray-500 transition-opacity"
        style={{ opacity: pullDist / 120, height: pullDist }}
      >
        {pullDist > 80 ? '↻ Refreshing…' : '↓ Pull to refresh'}
      </div>
      {children}
    </div>
  );
}
