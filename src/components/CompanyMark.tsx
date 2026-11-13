import React from 'react';

interface CompanyMarkProps {
  name: string;
  accentHex: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CompanyMark: React.FC<CompanyMarkProps> = ({
  name,
  accentHex,
  size = 'md',
}) => {
  const clean = name.trim();
  const initials = clean
    ? clean
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
    : '?';

  const dimensions =
    size === 'sm'
      ? 'w-7 h-7 text-[11px] rounded-md'
      : size === 'lg'
        ? 'w-11 h-11 text-sm rounded-xl'
        : 'w-9 h-9 text-xs rounded-lg';

  return (
    <div
      className={`${dimensions} shrink-0 flex items-center justify-center font-display font-bold tracking-tight select-none border company-mark`}
      style={{
        backgroundColor: `${accentHex}1F`,
        borderColor: `${accentHex}44`,
        color: accentHex,
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};
