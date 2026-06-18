import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  children: ReactNode;
};

export function IconButton({ label, active = false, children, className = '', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400',
        active
          ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
