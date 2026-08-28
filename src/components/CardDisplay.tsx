import { getCardDesign } from '@/lib/cardDesigns';

type Props = {
  cardNumber: number;
  cardHolder: string;
  balance: number;
  ifId?: string; // ИФ
  design: string;
  showDetails: boolean;
  logoSize?: 'sm' | 'md';
};

export function BankLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const text = size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <div className="flex items-center gap-2">
      <svg className={dims} viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="10" fill="#dc2626" />
        <path d="M12 14h16M12 20h16M12 26h10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="28" cy="26" r="4" fill="#fff" />
      </svg>
      <span className={`${text} font-bold tracking-tight`} style={{ color: 'var(--primary)' }}>
        Ricot Bank
      </span>
    </div>
  );
}

export default function CardDisplay({ cardNumber, cardHolder, balance, ifId, design, showDetails, logoSize = 'md' }: Props) {
  const d = getCardDesign(design);
  const numberDisplay = `#${String(cardNumber)}`;
  return (
    <div
      className="relative rounded-2xl p-5 shadow-soft-lg overflow-hidden"
      style={{
        background: d.photoUrl ? `url(${d.photoUrl}) center/cover` : d.gradient,
        color: d.text,
        aspectRatio: '1.586 / 1',
        maxWidth: '380px'
      }}
    >
      {/* IF (ИФ) in top-right */}
      <div className="absolute top-3 right-3 text-xs font-semibold bg-white/20 px-2 py-1 rounded">
        {ifId}
      </div>

      {/* Logo */}
      <div className="flex items-center justify-between">
        <BankLogo size={logoSize} />
        <div className="w-11 h-8 rounded-md flex items-center justify-center" style={{ background: d.chipColor, opacity: 0.9 }}>
          <div className="w-8 h-5 border border-current rounded-sm opacity-40" />
        </div>
      </div>

      {/* Balance */}
      <div className="mt-6 text-2xl font-semibold">{balance.toFixed(2)} $</div>

      {/* Card number */}
      <div className="font-mono text-lg tracking-wider font-medium mt-3">{numberDisplay}</div>

      {/* Card holder */}
      <div className="absolute bottom-4 left-5 text-sm uppercase">{cardHolder}</div>
    </div>
  );
}
