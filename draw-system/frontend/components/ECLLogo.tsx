interface ECLLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function ECLLogo({ size = 'md', showText = true }: ECLLogoProps) {
  const sizes = {
    sm: { container: 'h-10 w-10', icon: 'h-6 w-6', text: 'text-lg' },
    md: { container: 'h-12 w-12', icon: 'h-7 w-7', text: 'text-xl' },
    lg: { container: 'h-16 w-16', icon: 'h-10 w-10', text: 'text-2xl' },
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizes[size].container} rounded-lg bg-electric p-2 shadow-glow-electric`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${sizes[size].icon} text-background-primary`}
        >
          <path
            d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
            fill="currentColor"
          />
          <path
            d="M12 7l-5 2.5v5c0 2.78 1.92 5.37 4.5 6 2.58-.63 4.5-3.22 4.5-6v-5L12 7z"
            fill="currentColor"
            fillOpacity="0.3"
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${sizes[size].text} font-display font-bold uppercase text-text-primary`}>
            ECL
          </span>
          <span className="text-xs uppercase tracking-wider text-text-secondary">Draw System</span>
        </div>
      )}
    </div>
  );
}
