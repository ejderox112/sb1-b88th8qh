import { useEffect } from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    // Framework hazır olduğunu bildirmek için timeout kullan
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.frameworkReady) {
        window.frameworkReady();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);
}
