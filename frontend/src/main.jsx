import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'flag-icons/css/flag-icons.min.css';
import './styles/base.css';
import './styles/components.css';
import App from './App.jsx';
import { AppDataProvider } from './context/AppData.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </BrowserRouter>
  </StrictMode>,
);
