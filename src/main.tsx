import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {PortfolioProvider} from './lib/usePortfolio';
import App from './App';
import './styles/main.css';

// Remove the first-paint overlay only after the React application has committed.
// This prevents the unstyled SEO fallback from flashing on slower mobile devices.
function ReadyApp() {
  React.useLayoutEffect(() => {
    document.getElementById('boot-screen')?.remove();
  }, []);
  return <App />;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><PortfolioProvider><ReadyApp/></PortfolioProvider></BrowserRouter></React.StrictMode>);
