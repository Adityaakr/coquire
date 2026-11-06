import { useEffect } from 'react';
import { ArrowLeftRight, Bell, Boxes, Cpu, FileCheck, Globe, KeyRound, Layers, Link2, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import './landing.css';
import { LandingNav } from './Nav';
import { Clients } from './Hero';
import { Footer } from './Closing';
import { BgItem, BtnIcon, CapabilityCard, Container, IntegrationCard, ListItem, PreTitle, Section, Shot, StatItem, StepCard } from './fx';

const FX = '/fx/';

export function ProductPage() {
  useEffect(() => { document.title = 'Product | Coquire'; window.scrollTo(0, 0); }, []);
  return (
    <div style={{ background: '#fff', overflow: 'clip' }}>
      <LandingNav />
      <main>
        <header className="fx-sec fx-phero">
          <Container>
            <div className="fx-phero-content">
              <div className="fx-phero-left">
                <div className="fx-top-left">
                  <h1 className="fx-h1">Group buying built for API budgets</h1>
                  <p className="fx-body" style={{ maxWidth: 600 }}>One quote for the group, one signed limit per team, one guard that co-signs every call. Encrypted workloads in, receipts out.</p>
                </div>
                <div className="fx-phero-stats">
                  <StatItem size="sm" title="4 checks" description="Supplier, rate, request ID and allowance before every co-signature." />
                  <StatItem size="sm" title="1 signature" description="Per order. After that your agent pays per call under the limit." />
                </div>
                <BtnIcon to="/app?mode=buyer">Try the buyer demo</BtnIcon>
              </div>
              <div className="fx-phero-shot"><Shot name="app-portfolio" alt="The Coquire execution ledger" width={1400} height={800} mobileHeight={700} /></div>
            </div>
          </Container>
          {[['Rorgfh4qpKNsZyFzGNQ9wt5C0i4.png', 350, { left: -140, top: 40 }], ['fLN6Wx8BsWTV2MkQDeC8mB2BQKA.png', 240, { right: 40, top: 100 }], ['lSZuKptayJeB4Xcw10qjE7IisQw.png', 350, { right: -160, top: 330 }]].map(([f, h, pos]) => (
            <img key={f as string} src={FX + (f as string)} alt="" className="fx-cloud" style={{ height: h as number, ...(pos as object) }} aria-hidden />
          ))}
          <BgItem src={`${FX}QonQfzdUmEwRaww2TW9LW9ODvR0.jpg`} top />
        </header>
        <Clients />

        <Section className="fx-pad-t">
          <Container>
            <div className="fx-split">
              <div className="fx-imgpanel"><img src={`${FX}ixHeRnAI0qhzdoCm4eL8vAFx0.png`} alt="" /></div>
              <div className="fx-split-col">
                <div className="fx-top-left">
                  <PreTitle>Under the hood</PreTitle>
                  <h2 className="fx-h2">A limit enforced<br />at signing time</h2>
                  <div className="fx-split-list" style={{ paddingTop: 10 }}>
                    <ListItem>The team's payment account carries a 2-of-2 key: agent and guard</ListItem>
                    <ListItem>The agent signs each 402 payment; the guard co-signs only inside the terms</ListItem>
                    <ListItem>Only settled calls feed the replay set, so a declined attempt never blocks a retry</ListItem>
                    <ListItem>Totals are derived from settled payments, never stored, so budgets reconcile exactly</ListItem>
                  </div>
                </div>
                <BtnIcon variant="dark" to="/app?mode=buyer">Get started now</BtnIcon>
              </div>
            </div>
          </Container>
        </Section>

        <Section className="fx-caps">
          <Container>
            <div className="fx-top" style={{ maxWidth: 800, margin: '0 auto' }}>
              <PreTitle>Capabilities</PreTitle>
              <h2 className="fx-h2 fx-center">Everything inside Coquire</h2>
            </div>
            <div className="fx-caps-grid">
              <CapabilityCard icon={<Cpu size={24} />} title="Group quotes" description="Teams commit pages separately; suppliers quote the combined volume once, with a reservation fee split by pages." />
              <CapabilityCard icon={<ShieldCheck size={24} />} title="Four-check guard" description="Payee, price against the approved rate, request ID against settled calls, and remaining allowance." />
              <CapabilityCard icon={<KeyRound size={24} />} title="One signed permission" description="Supplier, rate, limit and order in one message your wallet signs. The agent key signs every call after that." />
              <CapabilityCard icon={<FileCheck size={24} />} title="Encrypted workloads" description="Each page is sealed for the approved supplier; each result is sealed for your team." />
              <CapabilityCard icon={<RefreshCw size={24} />} title="Sample before you buy" description="Run one page through the supplier endpoint and see the exact shape it returns, at no cost." />
              <CapabilityCard icon={<Bell size={24} />} title="Guard alerts" description="Every decline names its reason: over rate, replayed request, wrong payee or exhausted allowance." />
            </div>
          </Container>
          <BgItem src={`${FX}cQBpXWVe2IileA0HCzW5W4uvgY.jpg`} top bottom />
        </Section>

        <Section className="fx-pad-b">
          <Container>
            <div className="fx-top" style={{ maxWidth: 800, margin: '0 auto' }}>
              <PreTitle>How it works</PreTitle>
              <h2 className="fx-h2 fx-center">From shared request to per-call payment</h2>
              <p className="fx-body fx-center">Pool demand, approve one quote, and let your agent pay from your own budget.</p>
            </div>
            <div className="fx-stepcards">
              <StepCard number="01" title="Put your demand together" description="Describe the workload, commit your pages, invite another team. Suppliers see funded balances." />
              <StepCard number="02" title="Approve one quote" description="Run a sample, compare costs at your usage, approve. Price per call and deadline are fixed." variant="primary" />
              <StepCard number="03" title="Let your agent pay" description="Sign once. The agent signs each call, the guard co-signs, the facilitator settles USDC." variant="dark" />
            </div>
          </Container>
        </Section>

        <Section>
          <Container>
            <div className="fx-split">
              <div className="fx-split-col">
                <div className="fx-top-left">
                  <PreTitle>What the guard checks</PreTitle>
                  <h2 className="fx-h2">Four questions before<br />every co-signature</h2>
                  <p className="fx-body">Most API keys answer none of these. The guard answers all four, and the ledger shows the answers for every call.</p>
                </div>
                <div className="fx-split-list">
                  <ListItem>Is the payee the supplier the group approved?</ListItem>
                  <ListItem>Is the price at or below the approved rate?</ListItem>
                  <ListItem>Has this request ID already been settled?</ListItem>
                  <ListItem>Is there enough allowance left under the signed limit?</ListItem>
                </div>
              </div>
              <div className="fx-imgpanel"><img src={`${FX}ec4uQ2RRHVbYypFsBUsSov3augQ.png`} alt="" /></div>
            </div>
          </Container>
        </Section>

        <Section className="fx-pad-t" style={{ paddingBottom: 100 }}>
          <Container>
            <div className="fx-top" style={{ maxWidth: 800, margin: '0 auto 50px' }}>
              <PreTitle variant="white">Developers</PreTitle>
              <h2 className="fx-h2 fx-center">Use the same order from your own app</h2>
              <p className="fx-body fx-center">Orders, quotes and payments live on public rails. Coquire is one client for them.</p>
            </div>
            <div className="fx-integrations-grid">
              <IntegrationCard icon={<Globe size={24} color="#406AE4" />} title="Arkiv" description="Funded requests and signed quotes as entities that expire with the offer window." />
              <IntegrationCard icon={<ArrowLeftRight size={24} color="#10B981" />} title="x402 on Hedera" description="Agents pay per call in USDC; a facilitator sponsors network fees." />
              <IntegrationCard icon={<Link2 size={24} color="#5290F4" />} title="Chainlink CCIP" description="A treasury approval from Ethereum Sepolia the guard reads before co-signing." />
              <IntegrationCard icon={<Wallet size={24} color="#FF8B06" />} title="Wallets" description="MetaMask on Hedera testnet, or a local demo key when none is connected." />
              <IntegrationCard icon={<Boxes size={24} color="#FDBB6E" />} title="Adapters" description="Settlement, discovery, encryption and the OCR supplier sit behind one swap point." />
              <IntegrationCard icon={<Layers size={24} color="#1D1D1D" />} title="Pure domain" description="Guard, budget math and order lifecycle are pure functions with tests." />
            </div>
          </Container>
        </Section>
      </main>
      <Footer current="/product" />
    </div>
  );
}

