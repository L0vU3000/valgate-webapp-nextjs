import React from 'react';
import { cn } from '@/components/ui/utils';

interface SpinnerProps extends React.ComponentProps<'div'> {
	size?: number;
	thickness?: number;
	invert?: boolean;
	disabled?: boolean;
}

export function Spinner({ size = 16, thickness = 0.075, invert, disabled, className, ...props }: SpinnerProps) {
	if (disabled) return null;
	const sizePx = `${size}px`;
	const barWidth = `${(size * 0.2).toFixed(2)}px`;
	const barHeight = `${(size * thickness).toFixed(2)}px`;
	return (
		<div className={cn('relative', className)} style={{ width: sizePx, height: sizePx }} {...props}>
			{[...Array(5)].map((_, i) => (
				<div
					key={i}
					className="absolute inset-0 flex animate-spin justify-center"
					style={{ animationDelay: `${i * 100}ms` }}
				>
					<div
						style={{
							backgroundColor: invert ? 'var(--background)' : 'var(--foreground)',
							width: barWidth,
							height: barHeight,
							borderRadius: '9999px',
						}}
					/>
				</div>
			))}
		</div>
	);
}
