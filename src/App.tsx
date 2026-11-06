import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { WalletProvider } from '@/contexts/WalletContext';
import { StoreProvider } from '@/store/store';
import { LandingPage } from '@/landing/LandingPage';
import { ProductPage } from '@/landing/ProductPage';
import { DocsPage } from '@/docs/DocsPage';
import { UseCasesPage } from '@/landing/UseCasesPage';
import { AppLayout } from '@/app/AppLayout';
import { OnboardPage } from '@/app/OnboardPage';
import { OverviewPage } from '@/app/OverviewPage';
import { NewOrderPage } from '@/app/NewOrderPage';
import { OrderPage } from '@/app/OrderPage';
import { DiscoverPage } from '@/app/DiscoverPage';
import { SettingsPage } from '@/app/SettingsPage';

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
      <div>
        <div className="eyebrow" style={{ color: 'var(--fx-indigo)', marginBottom: 12 }}>404</div>
        <h1 style={{ fontSize: 40, fontWeight: 600 }}>Nothing here.</h1>
        <p style={{ color: 'var(--text-2)', marginTop: 10 }}><a href="/">Back to Coquire</a></p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/product" element={<ProductPage />} />
            <Route path="/use-cases" element={<UseCasesPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/docs/:slug" element={<DocsPage />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="onboard" element={<OnboardPage />} />
              <Route path="orders/new" element={<NewOrderPage />} />
              <Route path="orders/:id" element={<OrderPage />} />
              <Route path="discover" element={<DiscoverPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </WalletProvider>
  );
}
