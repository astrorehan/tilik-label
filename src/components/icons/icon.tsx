import type { SVGProps } from 'react';
import { ICON_SHAPES, type IconName, type IconShape } from './icon-shapes';

export type { IconName };

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName;
  size?: number;
  label?: string;
}

function Shape({ shape }: { shape: IconShape }) {
  const signalProps = shape.signal
    ? { fill: 'var(--icon-signal, currentColor)', stroke: 'none' }
    : {};
  switch (shape.kind) {
    case 'path':
      return <path d={shape.d} {...signalProps} />;
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...signalProps} />;
    case 'rect':
      return (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
          {...signalProps}
        />
      );
  }
}

export function Icon({ name, size = 24, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {ICON_SHAPES[name].map((shape, index) => (
        <Shape key={index} shape={shape} />
      ))}
    </svg>
  );
}
