import { cn } from '@/utils/cn'

const LOGO_SRC = '/logo.png'

interface AppLogoProps {
  /** auth: login panel · header: top bar / sidebar brand row */
  variant?: 'auth' | 'header'
  className?: string
}

const variantStyles = {
  auth: 'mx-auto w-full max-w-[280px] object-contain object-center',
  header: 'h-9 w-auto max-w-[8.5rem] object-contain object-left',
}

export function AppLogo({ variant = 'header', className }: AppLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="eBirth Cameroon"
      className={cn(variantStyles[variant], className)}
      draggable={false}
    />
  )
}
