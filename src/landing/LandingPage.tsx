import { useEffect } from 'react';
import './landing.css';
import { LandingNav } from './Nav';
import { Hero } from './Hero';
import { Comparison, Features, Integrations, Overview, Stats, Testimonials, UseCases } from './Sections';
import { BuiltOn, BuiltOnTicker, HowItWorksDiagram, PrivacyFlow, UseCaseGrid } from './Rails';
import { FAQs, Footer, Pricing } from './Closing';

export function LandingPage() {
  useEffect(() => { document.title = 'Coquire | Private Group Buying for API Capacity'; }, []);
  return (
    <div style={{ background: '#fff', overflow: 'clip' }}>
      <LandingNav />
      <main>
        <Hero />
        <BuiltOnTicker />
        <Comparison />
        <Features />
        <UseCaseGrid />
        <Overview />
        <HowItWorksDiagram />
        <PrivacyFlow />
        <UseCases />
        <BuiltOn />
        <Integrations />
        <Stats />
        <Testimonials />
        <Pricing />
        <FAQs />
      </main>
      <Footer />
    </div>
  );
}
