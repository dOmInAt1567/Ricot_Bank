import { useEffect, useRef, useState } from 'react';
import CardDisplay from '@/components/CardDisplay';

export default function CardCarousel({ cards }: { cards: any[] }) {
  const [idx, setIdx] = useState(0);
  const max = cards.length;
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({ left: idx * 400, behavior: 'smooth' });
  }, [idx]);

  if (max === 0) return <div className="text-center text-faint py-6">No cards</div>;

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIdx((p) => Math.max(0, p - 1))}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/70 rounded-full p-2 shadow"
      >
        ◀
      </button>
      <div ref={containerRef} className="overflow-hidden">
        <div className="flex gap-4" style={{ width: `${max * 400}px` }}>
          {cards.map((c) => (
            <div key={c.id} style={{ minWidth: 380 }}>
              <CardDisplay cardNumber={c.card_number} cardHolder={c.card_holder} balance={c.balance} ifId={c.account_id} design={c.design} showDetails={true} />
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => setIdx((p) => Math.min(max - 1, p + 1))}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/70 rounded-full p-2 shadow"
      >
        ▶
      </button>
      <div className="flex items-center justify-center gap-2 mt-3">
        {cards.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full ${i === idx ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>
    </div>
  );
}
