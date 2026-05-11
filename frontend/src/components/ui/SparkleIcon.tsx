interface SparkleIconProps {
  size?: number
  className?: string
  color?: string
}

export function SparkleIcon({ size = 16, className = '', color = 'currentColor' }: SparkleIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fill={color}
        d="M16 0 Q17 15 32 16 Q17 17 16 32 Q15 17 0 16 Q15 15 16 0 Z"
      />
    </svg>
  )
}
