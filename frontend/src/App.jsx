import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Toasts from './components/Toasts.jsx';
import { ErrorState } from './components/States.jsx';
import { useAppData } from './context/AppData.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ConverterPage from './pages/ConverterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

function CurrenciesGate({ children }) {
  const { currencies } = useAppData();
  if (currencies.error && !currencies.data) {
    return (
      <div className="page">
        <ErrorState
          title="Exchange rates could not be loaded"
          message={currencies.error.message}
          onRetry={currencies.reload}
        />
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CurrenciesGate><DashboardPage /></CurrenciesGate>} />
          <Route path="converter" element={<CurrenciesGate><ConverterPage /></CurrenciesGate>} />
          <Route path="analytics" element={<CurrenciesGate><AnalyticsPage /></CurrenciesGate>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toasts />
    </>
  );
}
