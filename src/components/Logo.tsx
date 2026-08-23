interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
}

// Uses the uploaded brand mark (public/logo.png) as a CSS mask so it can be tinted to
// match any theme color at runtime, the same way lucide icons pick up `color`/currentColor.
export default function Logo({ size = 24, color = 'currentColor', className }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="Nutro"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: 'url(/logo.png)',
        maskImage: 'url(/logo.png)',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        flexShrink: 0,
      }}
    />
  );
}
