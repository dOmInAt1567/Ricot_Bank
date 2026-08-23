import { getCardDesign } from '@/lib/cardDesigns';

type Props = {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
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

export default function CardDisplay({ cardNumber, cardHolder, expiryMonth, expiryYear, cvv, design, showDetails, logoSize = 'md' }: Props) {
  const d = getCardDesign(design);
  const displayNumber = showDetails
    ? cardNumber.match(/.{1,4}/g)?.join(' ') ?? cardNumber
    : `•••• •••• •••• ${cardNumber.slice(-4)}`;
  const displayCvv = showDetails ? cvv : '•••';

  return (
    <div
      className="relative rounded-2xl p-5 shadow-soft-lg overflow-hidden"
      style={{ background: d.gradient, color: d.text, aspectRatio: '1.586 / 1', maxWidth: '380px' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10" style={{ background: d.text }} />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-5" style={{ background: d.text }} />

      <div className="relative flex flex-col h-full justify-between">
        {/* Top row: logo + chip */}
        <div className="flex items-start justify-between">
          <BankLogo size={logoSize} />
          <div className="w-11 h-8 rounded-md flex items-center justify-center" style={{ background: d.chipColor, opacity: 0.9 }}>
            <div className="w-8 h-5 border border-current rounded-sm opacity-40" />
          </div>
        </div>

        {/* Card number */}
        <div className="font-mono text-lg tracking-wider font-medium mt-3">
          {displayNumber}
        </div>

        {/* Bottom row: holder + expiry */}
        <div className="flex items-end justify-between mt-2">
          <div>
            <p className="text-[10px] opacity-60 uppercase tracking-wider">Card Holder</p>
            <p className="text-sm font-semibold uppercase truncate max-w-[180px]">{cardHolder}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-60 uppercase tracking-wider">Expires</p>
            <p className="text-sm font-semibold font-mono">{showDetails ? `${expiryMonth}/${expiryYear}` : '••/••'}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] opacity-60 uppercase tracking-wider">CVV</p>
            <p className="text-sm font-semibold font-mono">{displayCvv}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
