import { useState } from 'react';
import { Accordion, Btn, BtnIcon, Container, FaqsCta, ListItem, PreTitle, Section } from './fx';
import { Wordmark } from './Nav';

const FX = '/fx/';
const SOCIALS: [string, string, string][] = [
  ['https://x.com/', 'X', 'M17.8 3h3l-6.7 7.6L22 21h-6.2l-4.8-6.3L5.4 21h-3l7.1-8.2L2 3h6.3l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z'],
  ['https://www.linkedin.com/', 'LinkedIn', 'M20.4 2H3.6A1.6 1.6 0 0 0 2 3.6v16.8A1.6 1.6 0 0 0 3.6 22h16.8a1.6 1.6 0 0 0 1.6-1.6V3.6A1.6 1.6 0 0 0 20.4 2ZM8 19H5V9h3v10ZM6.5 7.7a1.7 1.7 0 1 1 0-3.5 1.7 1.7 0 0 1 0 3.5ZM19 19h-3v-4.9c0-1.2 0-2.7-1.6-2.7s-1.9 1.3-1.9 2.6V19h-3V9h2.9v1.4c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.7V19Z'],
  ['https://github.com/', 'GitHub', 'M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2Z'],
];

/* ---------- Pricing → worked example ---------- */
export function Pricing() {
  const [teamA, setTeamA] = useState(true);
  const t = teamA
    ? { pages: 150, alone: '9.00', group: '6.75', fee: '1.50', total: '8.25', saves: '0.75' }
    : { pages: 50, alone: '3.00', group: '2.25', fee: '0.50', total: '2.75', saves: '0.25' };
  return (
    <Section id="pricing" className="fx-pricing">
      <Container>
        <div className="fx-pricing-in">
          <div className="fx-top">
            <PreTitle>Worked example</PreTitle>
            <h2 className="fx-h2 fx-center">Give suppliers a bigger order to quote on</h2>
            <p className="fx-body fx-center">Two bookkeeping teams, 200 invoice pages, one quote. List rate 0.06 USDC per page, group rate 0.045, reservation fee 2.00 split by pages.</p>
          </div>
          <div className="fx-pricing-item">
            <div className="fx-pricing-toggle">
              <span data-off={!teamA}>Team A · 150 pages</span>
              <button type="button" role="switch" aria-checked={!teamA} aria-label="Toggle team" className="fx-toggle" onClick={() => setTeamA((v) => !v)}><i /></button>
              <span data-off={teamA} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Team B · 50 pages <span className="fx-offer">same rate</span></span>
              <span className="fx-pricing-toggle-line" aria-hidden />
            </div>
            <div className="fx-pricing-frame">
              <div className="fx-pricing-grid">
                <div className="fx-plan">
                  <div className="fx-plan-head">
                    <div><div className="fx-plan-t">Buying alone</div><div className="fx-plan-s">{t.pages} pages at the list rate</div></div>
                  </div>
                  <div className="fx-plan-price"><b>{t.alone}</b><span>USDC</span></div>
                  <Btn variant="dark" to="/app?mode=buyer" block>Try it with your numbers</Btn>
                  <div className="fx-plan-list">
                    <ListItem>0.06 USDC per page, no volume discount</ListItem>
                    <ListItem>One small order the supplier prices high</ListItem>
                    <ListItem>No reservation fee, no commitment either way</ListItem>
                    <ListItem>Pay from an API key with no spending limit</ListItem>
                    <ListItem>Invoices sent in the clear to the vendor</ListItem>
                    <ListItem>No receipt per call</ListItem>
                  </div>
                </div>
                <div className="fx-plan fx-plan-dark">
                  <div className="fx-plan-head">
                    <div><div className="fx-plan-t">With the group quote</div><div className="fx-plan-s">{t.pages} pages at the group rate</div></div>
                    <span className="fx-plan-popular">Saves {t.saves}</span>
                  </div>
                  <div className="fx-plan-price"><b>{t.total}</b><span>USDC</span></div>
                  <Btn to="/app?mode=buyer" block>Start a group order</Btn>
                  <div className="fx-plan-list">
                    <ListItem>{t.group} USDC for pages at 0.045 per page</ListItem>
                    <ListItem>{t.fee} USDC reservation share, paid at start</ListItem>
                    <ListItem>Supplier quotes 200 pages, not {t.pages}</ListItem>
                    <ListItem>Your agent pays per call under a signed limit</ListItem>
                    <ListItem>Each page encrypted for the approved supplier</ListItem>
                    <ListItem>A receipt for every settled call</ListItem>
                  </div>
                </div>
              </div>
              <div className="fx-pricing-foot"><span>1 call = 1 page</span><i /><span>Unused budget never leaves your account</span><i /><span>Illustrative pricing</span></div>
            </div>
            <div className="fx-enterprise">
              <div>
                <h3 className="fx-h6">API suppliers</h3>
                <p className="fx-body">See the budget before you quote. Find funded requests with a defined workload, volume and deadline, then quote once against the combined volume.</p>
              </div>
              <div><Btn variant="dark" to="/app?mode=supplier">Explore the supplier demo</Btn></div>
              <img src={`${FX}KbVFR1CeRk5msFRW70lzRZLV8I.png`} alt="" aria-hidden />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ---------- FAQs ---------- */
const QS: [string, string][] = [
  ['Do I approve every API call?', 'No. You approve the supplier, the rate and a spending limit once per order. Your agent can then pay for calls within those terms, and the guard refuses anything outside them.'],
  ['Where does the spending limit live?', 'The team\'s payment account carries a 2-of-2 key: your agent and the Coquire guard. The guard signs only after checking supplier, rate, request ID and remaining limit, so the limit is enforced at signing time, not by trusting the agent. In this demo both keys are local to your browser and settlement is simulated.'],
  ['What happens to unused funds?', 'They never leave your Hedera account. If your agent processes fewer pages than you committed, you simply spend less. Your share of any reservation fee goes to the supplier when the order starts.'],
  ['What if a supplier asks for a higher price?', 'The guard declines to co-sign a charge above the approved rate. The call is not paid, the ledger shows why, and you decide whether to accept a new quote.'],
  ['What is public and what is not?', 'Order terms, combined volume, team addresses and per-call USDC payments are public on Hedera. Invoice pages are encrypted for the approved supplier only; results for your team only. Call counts are visible even when contents are not.'],
  ['What can I try in the demo?', 'Create or join an invoice-processing order, watch a second team join and two suppliers quote, run a sample page, approve a quote, sign the agent permission and run the agent. Then make the supplier misbehave and watch the guard refuse.'],
];
export function FAQs() {
  return (
    <Section id="faq" className="fx-faqs">
      <Container>
        <div className="fx-split">
          <div className="fx-faqs-left">
            <div className="fx-top-left">
              <h2 className="fx-h2">Frequently asked questions</h2>
              <p className="fx-body">The short answers about limits, privacy and what is real in this build.</p>
            </div>
            <FaqsCta avatars={['gDcaZH5xt6hqSU2VbK2snAw.jpg', 'X0ECJ5xGgYrCVgHB8RYd3RABTQ.jpg', '622M5cyJBdKPIK1fPnBlo3qONk.jpg'].map((a) => FX + a)} />
          </div>
          <div className="fx-acc-list">
            {QS.map(([q, a], i) => <Accordion key={q} question={q} answer={a} open={i === 0} />)}
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ---------- Footer (CTA + card) ---------- */
export function Footer({ current }: { current?: string }) {
  const cols: [string, [string, string][]][] = [
    ['Quick links', [['/#features', 'Features'], ['/#how-it-works', 'How it works'], ['/use-cases', 'Use cases & references'], ['/#integrations', 'Developers']]],
    ['Pages', [['/product', 'Product'], ['/app?mode=buyer', 'Buyer demo'], ['/app?mode=supplier', 'Supplier demo'], ['/app/discover', 'Open orders']]],
    ['Built on', [['https://docs.hedera.com/solutions/ai/x402', 'x402 on Hedera'], ['https://arkiv.network/', 'Arkiv'], ['https://docs.chain.link/ccip', 'Chainlink CCIP'], ['/docs', 'Developer docs']]],
  ];
  return (
    <footer className="fx-sec fx-footer">
      <Container>
        <div className="fx-footer-content">
          <div className="fx-footer-cta">
            <div className="fx-top">
              <h2 className="fx-h2 fx-center">See a group order go from quote to payment</h2>
              <p className="fx-body fx-center">Follow two teams as they request capacity, choose a supplier, and pay for invoice scans from separate budgets.</p>
            </div>
            <div className="fx-buttons">
              <BtnIcon to="/app?mode=buyer">Explore the demo</BtnIcon>
              <Btn to="/product">View product</Btn>
            </div>
          </div>
          <div className="fx-footer-card">
            <div className="fx-footer-grid">
              <div className="fx-footer-brand">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
                  <Wordmark size={30} />
                  <p className="fx-body">Private group buying for API capacity. Pool demand, approve one quote, pay per call from your own budget.</p>
                </div>
                <Btn variant="dark" href="mailto:hello@coquire.xyz">hello@coquire.xyz</Btn>
              </div>
              <div className="fx-footer-cols">
                {cols.map(([h, links]) => (
                  <div key={h} className="fx-footer-col">
                    <h4>{h}</h4>
                    <ul>{links.map(([href, l]) => <li key={href}><a href={href} aria-current={href === current ? 'page' : undefined} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{l}</a></li>)}</ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="fx-footer-bar">
              <p>Built on <a href="https://hedera.com/" target="_blank" rel="noreferrer">Hedera</a> testnet. Settlement, discovery and encryption are simulated in this demo; signatures and wallet connection are real.</p>
              <div className="fx-socials">
                {SOCIALS.map(([href, label, path]) => (
                  <a key={href} href={href} className="fx-social" target="_blank" rel="noreferrer" aria-label={label}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={path} /></svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
      <div className="fx-bgitem" aria-hidden style={{ height: '100%' }}>
        <div className="fx-bg-overlay" style={{ height: '55%' }} />
        <img src={`${FX}Osh2UHQcarC8mZnL6oh6gwYnbA.jpg`} alt="" className="fx-bgimg" />
      </div>
    </footer>
  );
}
