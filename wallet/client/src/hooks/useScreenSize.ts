import { useState, useEffect } from 'react';

/**
 * useScreenSize hook
 * Dynamically detects mobile/desktop based on CSS breakpoint (768px)
 */
export function useScreenSize() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    // Update state based on media query
    const handleResize = () => setIsMobile(mediaQuery.matches);

    mediaQuery.addEventListener('change', handleResize);

    // Initial check
    handleResize();

    // Cleanup listener on unmount
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  return { isMobile };
}
