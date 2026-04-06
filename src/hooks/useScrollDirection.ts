import { useState, useEffect, useRef } from 'react';

export function useScrollDirection() {
  const [show, setShow] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      setShow(window.scrollY < lastScrollY.current || window.scrollY < 50);
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return show;
}
