import { useRef, useEffect, useState } from 'react';
import { Animated } from 'react-native';

export const useScanToast = (lastScanned: string | null) => {
  const [visibleItem, setVisibleItem] = useState<string | null>(null);
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (lastScanned) {
      setVisibleItem(lastScanned);
      
      // Pop in
      Animated.spring(animValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 40,
      }).start();

      // Fade out after 2 seconds
      const timeout = setTimeout(() => {
        Animated.timing(animValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setVisibleItem(null);
        });
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [lastScanned, animValue]);

  return {
    visibleItem,
    animValue,
  };
};
