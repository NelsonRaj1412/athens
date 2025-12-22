// src/common/hooks/useResponsive.ts

import { useState, useEffect } from 'react';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
}

interface ResponsiveConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  largeDesktop: number;
}

const defaultBreakpoints: ResponsiveConfig = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
  largeDesktop: 1600
};

export const useResponsive = (breakpoints: ResponsiveConfig = defaultBreakpoints): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const height = typeof window !== 'undefined' ? window.innerHeight : 800;
    
    return {
      isMobile: width < breakpoints.mobile,
      isTablet: width >= breakpoints.mobile && width < breakpoints.desktop,
      isDesktop: width >= breakpoints.desktop && width < breakpoints.largeDesktop,
      isLargeDesktop: width >= breakpoints.largeDesktop,
      screenWidth: width,
      screenHeight: height
    };
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        setState({
          isMobile: width < breakpoints.mobile,
          isTablet: width >= breakpoints.mobile && width < breakpoints.desktop,
          isDesktop: width >= breakpoints.desktop && width < breakpoints.largeDesktop,
          isLargeDesktop: width >= breakpoints.largeDesktop,
          screenWidth: width,
          screenHeight: height
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [breakpoints]);

  return state;
};

export const ResponsiveUtils = {
  getColumns: (complexity: 'simple' | 'complex' = 'simple') => {
    if (complexity === 'simple') {
      return {
        xs: 24, sm: 12, md: 12, lg: 8, xl: 6, xxl: 4
      };
    } else {
      return {
        xs: 24, sm: 24, md: 12, lg: 8, xl: 8, xxl: 6
      };
    }
  },

  getSpacing: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md', screenWidth: number) => {
    const baseSpacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
    const multiplier = screenWidth < 768 ? 0.75 : screenWidth < 1200 ? 1 : 1.25;
    return Math.round(baseSpacing[size] * multiplier);
  },

  getFontSize: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'md', screenWidth: number) => {
    const baseSizes = { xs: 12, sm: 14, md: 16, lg: 18, xl: 24, xxl: 32 };
    const multiplier = screenWidth < 768 ? 0.875 : screenWidth < 1200 ? 1 : 1.125;
    return Math.round(baseSizes[size] * multiplier);
  },

  isTouchDevice: () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  getTableScroll: (screenWidth: number) => {
    if (screenWidth < 768) {
      return { x: 600, y: 400 };
    } else if (screenWidth < 1200) {
      return { x: 800, y: 500 };
    } else {
      return { x: 'max-content', y: 600 };
    }
  },

  getModalConfig: (screenWidth: number) => {
    if (screenWidth < 768) {
      return {
        width: '100%',
        style: { top: 0, margin: '8px' },
        bodyStyle: { maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }
      };
    } else if (screenWidth < 1200) {
      return {
        width: '90%',
        style: { top: 32 },
        bodyStyle: { maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }
      };
    } else {
      return {
        width: 800,
        style: { top: 100 },
        bodyStyle: { maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }
      };
    }
  }
};

export const useResponsiveSidebar = () => {
  const { isMobile, isTablet } = useResponsive();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);

  useEffect(() => {
    if (isMobile || isTablet) {
      setMobileVisible(false);
    }
  }, [isMobile, isTablet]);

  const toggleSidebar = () => {
    if (isMobile || isTablet) {
      setMobileVisible(!mobileVisible);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const closeMobileSidebar = () => {
    if (isMobile || isTablet) {
      setMobileVisible(false);
    }
  };

  return {
    collapsed,
    mobileVisible,
    toggleSidebar,
    closeMobileSidebar,
    isMobile,
    isTablet
  };
};

export default useResponsive;