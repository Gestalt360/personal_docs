import React, { useRef, useState, useCallback } from 'react';
import { Archive, Pin, Trash2 } from 'lucide-react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onArchive?: () => void;
  onPin?: () => void;
  onTrash?: () => void;
}

export default function SwipeableCard({ children, onArchive, onPin, onTrash }: SwipeableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [swiping, setSwiping] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    currentX.current = dx;
    // Clamp to -120..120 range
    setOffsetX(Math.max(-120, Math.min(120, dx)));
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    const dx = currentX.current;

    if (dx < -80 && onArchive) {
      onArchive();
    } else if (dx > 80 && onPin) {
      onPin();
    } else if (dx < -120 && onTrash) {
      onTrash();
    }

    setOffsetX(0);
  }, [onArchive, onPin, onTrash]);

  const hasActions = onArchive || onPin || onTrash;

  if (!hasActions) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Action hint — visible behind the card during swipe */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-green-600 bg-green-50"
           style={{ opacity: offsetX < -40 ? Math.min(1, Math.abs(offsetX + 40) / 80) : 0 }}>
        <Archive size={20} />
      </div>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 bg-blue-50"
           style={{ opacity: offsetX > 40 ? Math.min(1, (offsetX - 40) / 80) : 0 }}>
        <Pin size={20} />
      </div>

      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: swiping ? `translateX(${offsetX}px)` : 'translateX(0)',
          transition: swiping ? 'none' : 'transform 0.3s ease',
          touchAction: 'pan-y',
        }}
        className="relative bg-white z-10"
      >
        {children}
      </div>
    </div>
  );
}
