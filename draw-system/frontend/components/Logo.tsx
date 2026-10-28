import { Trophy } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-xl' },
    md: { icon: 'w-10 h-10', text: 'text-2xl' },
    lg: { icon: 'w-14 h-14', text: 'text-3xl' },
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizes[size].icon} rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center shadow-lg shadow-gold/30`}>
        <Trophy className={`${size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'} text-navy`} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`${sizes[size].text} font-display font-bold text-gradient-gold leading-none`}>
            ECL
          </span>
          <span className="text-xs text-muted uppercase tracking-wider">Draw System</span>
        </div>
      )}
    </div>
  );
}
