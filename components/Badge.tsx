import React from 'react';

interface BadgeProps {
  cls?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ cls = "", children }) => {
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm ${cls}`}>
      {children}
    </span>
  );
};