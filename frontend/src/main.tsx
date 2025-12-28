// src/main.tsx

import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, message } from 'antd';
import App from './app/App';

// Import our custom theme system components
import { ThemeProvider, useTheme } from './common/contexts/ThemeContext';
import { antdTheme } from './common/theme/antdTheme';

// Import the one, consolidated CSS file
import './common/styles/global.css';
// Import Ant Design Alert dual mode styles
import './styles/ant-alert-dual-mode.css';

// Development warning suppression for deprecated Antd warnings
if (import.meta.env.DEV) {
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (
      args.length > 0 &&
      typeof args[0] === 'string' &&
      args[0].startsWith('Warning: [antd: Modal] `bodyStyle` is deprecated')
    ) {
      return;
    }
    return originalConsoleError.apply(console, args);
  };
}

// A new wrapper component to access the theme context.
// This is the correct, clean pattern.
const Main = () => {
  const { effectiveTheme } = useTheme();
  const antdConfig = antdTheme(effectiveTheme);

  useEffect(() => {
    // Configure global message to work with direct imports
    message.config({
      top: 100,
      duration: 3,
      maxCount: 3,
    });
  }, []);

  return (
    <ConfigProvider theme={antdConfig}>
      <AntdApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
};

// Render the entire application. This structure is correct.
createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode> // Temporarily disabled to prevent double API calls
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  // </React.StrictMode>
);