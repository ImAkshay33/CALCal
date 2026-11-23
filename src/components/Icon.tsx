import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number | string;
  fill?: boolean;
  className?: string;
}

export function Icon({ name, size, fill = false, className, style, ...props }: IconProps) {
  const iconStyle: React.CSSProperties = {
    fontSize: typeof size === 'number' ? `${size}px` : size,
    fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0",
    ...style,
  };

  return (
    <span
      className={cn('material-symbols-outlined select-none inline-flex items-center justify-center leading-none', className)}
      style={iconStyle}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
