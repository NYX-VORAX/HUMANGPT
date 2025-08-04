'use client'

interface SmoothScrollProviderProps {
  children: React.ReactNode
}

export default function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  // Lenis removed - using normal browser scrolling behavior
  return <>{children}</>
}
