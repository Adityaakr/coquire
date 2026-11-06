import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Building2, FileText, Landmark, Quote, ShieldCheck, Sparkles, Users } from 'lucide-react';
import './landing.css';
import { LandingNav } from './Nav';
import { Clients } from './Hero';
import { Footer } from './Closing';
import { BgItem, Btn, BtnIcon, CapabilityCard, Container, ListItem, PreTitle, Section, StatItem } from './fx';

const FX = '/fx/';

type Ref = { who: string; title: string; date: string; url: string; quote: string; note?: string };

const AGENT_PAYMENTS: Ref[] = [
  { who: 'a16z crypto (Sam Broner)', title: 'Tourists in the bazaar: why agents will need B2B payments', date: '2026-02-19', url: 'https://a16zfrontier.com/posts/article/against-b2b-payments-stablecoins/', quote: 'Agents won\'t pay like tourists. They\'ll pay like locals — through relationships, credit, and repeat business.', note: 'Also: "most high-volume spend will move onto pre-negotiated B2B terms." That is a group quote.' },
  { who: 'a16z crypto', title: 'The missing infrastructure for AI agents: 5 ways blockchains can help', date: '2026-04-16', url: 'https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/', quote: 'x402 is processing roughly $1.6 million per month in agent-driven payments.' },
  { who: 'Chainalysis', title: 'North America: inside the growth of agentic commerce', date: '2026-10-14', url: 'https://www.chainalysis.com/blog/north-america-crypto-adoption-2026/', quote: 'Over 87% of payments fall between a hundredth of a cent and a dime.', note: 'Also reports over 138 million x402 transactions on Base in the period.' },
  { who: 'Cloudflare', title: 'Launching the x402 Foundation with Coinbase', date: '2025-09-23', url: 'https://blog.cloudflare.com/x402/', quote: 'MCP servers can expose tools to be paid for via x402.' },
  { who: 'Cloudflare', title: 'Introducing pay per crawl', date: '2025-07-01', url: 'https://blog.cloudflare.com/introducing-pay-per-crawl/', quote: 'We\'re excited to help dust off a mostly forgotten piece of the web: HTTP response code 402.' },
  { who: 'x402.org', title: 'The x402 protocol', date: '2026-10-27', url: 'https://www.x402.org/', quote: 'If a request arrives without payment, the server responds with HTTP 402, prompting the client to pay and retry.' },
  { who: 'Coinbase (Shan Aggarwal) via American Banker', title: 'Coinbase plans an agent-to-agent protocol', date: '2025-09-25', url: 'https://www.americanbanker.com/payments/news/coinbase-plans-an-agent-to-agent-protocol', quote: 'For agentic commerce to scale, we need a standard for how these transactions work.' },
  { who: 'Google Cloud', title: 'Powering AI commerce with the new Agent Payments Protocol (AP2)', date: '2025-09-16', url: 'https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol', quote: 'AP2 builds trust by using Mandates — tamper-proof, cryptographically-signed digital contracts that serve as verifiable proof of a user\'s instructions.', note: 'Coquire\'s signed permission is a mandate of exactly this shape: supplier, rate, limit, order.' },
  { who: 'Visa (Jack Forestell)', title: 'Find and Buy with AI: Visa unveils new era of commerce', date: '2025-04-30', url: 'https://investor.visa.com/news/news-details/2025/Find-and-Buy-with-AI-Visa-Unveils-New-Era-of-Commerce/default.aspx', quote: 'Each consumer sets the limits, and Visa helps manage the rest.' },
  { who: 'Stripe', title: 'Agentic Commerce Suite', date: '2025-12-11', url: 'https://stripe.com/blog/agentic-commerce-suite', quote: 'Every token can be scoped to a specific seller, bounded by time and amount, and observable throughout its lifecycle.' },
];

const SPEND_CONTROLS: Ref[] = [
  { who: 'Hedera', title: 'Agent Accounts', date: '2026', url: 'https://hedera.com/agent-accounts', quote: 'Define spending policies, approved recipient accounts, and daily & per-transaction spending limits before your agent ever touches a dollar.' },
  { who: 'Coinbase via The Paypers', title: 'Coinbase launches Agentic Wallets', date: '2026-02-13', url: 'https://thepaypers.com/crypto-web3-and-cbdc/news/coinbase-launches-agentic-wallets-for-autonomous-ai-agents', quote: 'programmable spending limits, with controls for session caps and transaction-level restrictions.' },
  { who: 'TechCrunch on Skyfire', title: 'Skyfire lets AI agents spend your money', date: '2024-08-21', url: 'https://techcrunch.com/2024/08/21/skyfire-lets-ai-agents-spend-your-money/', quote: 'If an AI agent tries to overspend, it will ping a human to review it.' },
];

const GROUP_BUYING: Ref[] = [
  { who: 'HSCA / Dobson DaVanzo via Healthcare Purchasing News', title: 'GPOs save the healthcare industry up to $34.1 billion annually', date: '2019-05-16', url: 'https://www.hpnonline.com/sourcing-logistics/gpo-models/article/21080804/new-analysis-finds-gpos-save-healthcare-industry-and-taxpayers-up-to-341-billion-annually', quote: 'GPOs save the entire healthcare system up to $34.1 billion annually.', note: 'Industry-funded study; 13.1% lower supply costs reported.' },
  { who: 'MSU ICER (Brian O\'Shea)', title: 'Letter from the director: cluster buy-in', date: '2022', url: 'https://icer.msu.edu/news/letter-from-the-director-cluster-buy-in', quote: 'multiple investigators may split the cost of one or more nodes to serve as a shared resource!' },
  { who: 'Purdue RCAC', title: 'New cluster gives Purdue researchers easy access to a large GPU-based system', date: '2018-04-26', url: 'https://rcac.purdue.edu/news/1183', quote: 'For $2,400 per year, researchers can buy into a shared queue available only to those who have purchased access.' },
  { who: 'AWS', title: 'Announcing Amazon EC2 Capacity Blocks for ML', date: '2023-10-31', url: 'https://aws.amazon.com/blogs/aws/announcing-amazon-ec2-capacity-blocks-for-ml-to-reserve-gpu-capacity-for-your-machine-learning-workloads/', quote: 'The total price of an EC2 Capacity Block is charged up front, and the price does not change after purchase.', note: 'Reserved capacity with a fixed price is the shape of a group quote; Coquire adds the per-call settlement.' },
];

const HEDERA: Ref[] = [
  { who: 'Hedera docs', title: 'Why Hedera', date: '2026', url: 'https://docs.hedera.com/learn/getting-started/why-hedera', quote: 'Hedera delivers 3–5 second absolute finality — not probabilistic.' },
  { who: 'Hedera', title: 'x402 bounty', date: '2026', url: 'https://hedera.com/x402-bounty/', quote: 'On Hedera they settle in seconds at a fixed fee of $0.001 per transfer.' },
  { who: 'Hedera docs', title: 'x402 on Hedera', date: '2026', url: 'https://docs.hedera.com/solutions/ai/x402', quote: 'AI agents paying for API calls, context, datasets, inference, or tool use on demand.' },
  { who: 'Circle', title: 'USDC comes to Hedera', date: '2021-10-18', url: 'https://www.circle.com/blog/usdc-comes-to-hedera-the-first-carbon-negative-enterprise-grade-decentralized-network', quote: 'Hedera uses hashgraph technology to deliver high transaction throughput and settlement in seconds.' },
];

function RefList({ refs }: { refs: Ref[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {refs.map((r) => (
        <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="fx-ovcard" style={{ alignItems: 'flex-start', minHeight: 0, textDecoration: 'none' }}>
          <span className="fx-ovcard-ic"><Quote size={18} strokeWidth={2} /></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <p className="fx-ovcard-p"><span>“{r.quote}”</span></p>
            <div className="fx-xs" style={{ color: 'var(--fx-slate)' }}>{r.who} · {r.title} · {r.date}{r.note ? <><br /><span style={{ color: 'var(--fx-jet)' }}>{r.note}</span></> : null}</div>
          </div>
        </a>
      ))}
    </div>
  );
}

export function UseCasesPage() {
  useEffect(() => { document.title = 'Use cases & references | Coquire'; window.scrollTo(0, 0); }, []);
  return (
    <div style={{ background: '#fff', overflow: 'clip' }}>
      <LandingNav />
      <main>
        <header className="fx-sec fx-phero" style={{ paddingBottom: 100 }}>
          <Container>
            <div className="fx-phero-content">
              <div className="fx-phero-left">
                <div className="fx-top-left">
                  <PreTitle>Use cases &amp; references</PreTitle>
                  <h1 className="fx-h1">Who buys together, and why the rails matter</h1>
                  <p className="fx-body" style={{ maxWidth: 600 }}>Group purchasing is old. Agents that pay per call are new. Coquire joins the two on public rails so any team, supplier or agent can take part without trusting Coquire with a budget or a file.</p>
                </div>
                <div className="fx-phero-stats">
                  <StatItem size="sm" title="$1.6M / month" description="Agent-driven payments over x402, per a16z crypto (April 2026)." />
                  <StatItem size="sm" title="87%" description="Of x402 payments are between a hundredth of a cent and a dime, per Chainalysis." />
                </div>
                <BtnIcon to="/app?mode=buyer">Try the buyer demo</BtnIcon>
              </div>
              <div className="fx-imgpanel"><img src={`${FX}ixHeRnAI0qhzdoCm4eL8vAFx0.png`} alt="" /></div>
            </div>
          </Container>
          <BgItem src={`${FX}QonQfzdUmEwRaww2TW9LW9ODvR0.jpg`} top />
        </header>
        <Clients />

        <Section className="fx-caps">
          <Container>
            <div className="fx-top" style={{ maxWidth: 800, margin: '0 auto' }}>
              <PreTitle>Use cases</PreTitle>
              <h2 className="fx-h2 fx-center">Six ways teams use a group order</h2>
            </div>
            <div className="fx-caps-grid">
              <CapabilityCard icon={<FileText size={24} />} title="Bookkeeping backlogs" description="Two firms with 150 and 50 invoice pages get one OCR quote for 200. Each pays per page from its own budget; nobody sees the other's invoices." />
              <CapabilityCard icon={<Building2 size={24} />} title="Agency month-end" description="An agency and its subcontractors pool receipt digitisation for the close. The agency approves the quote; each party's agent pays for its own pages." />
              <CapabilityCard icon={<Users size={24} />} title="Treasury on another chain" description="A DAO treasury on Ethereum approves a spend cap once over CCIP. Agents on Hedera pay under that cap; the guard reads the approval before every co-signature." />
              <CapabilityCard icon={<Boxes size={24} />} title="API suppliers filling capacity" description="A vendor quotes combined volume and sees funded balances before signing. Payment arrives per call, with a reservation fee at start." />
              <CapabilityCard icon={<ShieldCheck size={24} />} title="Finance ops controlling agents" description="Give an agent a signed limit per order, not an API key. Every settled call shows four checks; every decline names its reason." />
              <CapabilityCard icon={<Sparkles size={24} />} title="Agent builders" description="Discover funded orders on Arkiv, pay the supplier over x402 from your own client, and read the same ledger. Coquire is one client for the rails, not a gatekeeper." />
            </div>
          </Container>
          <BgItem src={`${FX}cQBpXWVe2IileA0HCzW5W4uvgY.jpg`} top bottom />
        </Section>

        <Section className="fx-pad-b">
          <Container>
            <div className="fx-split">
              <div className="fx-split-col fx-split-narrow">
                <div className="fx-top-left">
                  <PreTitle>Why interoperability</PreTitle>
                  <h2 className="fx-h2">The order is not locked inside Coquire</h2>
                  <p className="fx-body">Each rail does one job and any party can verify it without asking us.</p>
                </div>
                <div className="fx-split-list">
                  <ListItem>Arkiv: the order and every signed quote are entities with an expiry. Other apps can list them.</ListItem>
                  <ListItem>x402 on Hedera: the supplier is a plain 402 resource server. Any client that can pay can use it.</ListItem>
                  <ListItem>Chainlink CCIP: a treasury on Ethereum approves a cap; the guard on Hedera reads it.</ListItem>
                  <ListItem>ECIES: pages are sealed to the supplier key, results to the team's agent key. The server stores ciphertext only.</ListItem>
                </div>
                <Btn variant="dark" to="/docs/overview">Read the docs</Btn>
              </div>
              <div className="fx-imgpanel"><img src={`${FX}ec4uQ2RRHVbYypFsBUsSov3augQ.png`} alt="" /></div>
            </div>
          </Container>
        </Section>

        <Section style={{ paddingBottom: 100 }}>
          <Container>
            <div className="fx-top" style={{ maxWidth: 800, margin: '0 auto 50px' }}>
              <PreTitle variant="white">References</PreTitle>
              <h2 className="fx-h2 fx-center">What the people building these rails say</h2>
              <p className="fx-body fx-center">Every quote below is on the linked page. Dates are the publication dates. Older items are included where the mechanism, not the date, is the point.</p>
            </div>
            <div className="fx-split" style={{ alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 className="fx-h5" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Sparkles size={22} /> Agents paying per call</h3>
                <RefList refs={AGENT_PAYMENTS} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 className="fx-h5" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><ShieldCheck size={22} /> Spending limits for agents</h3>
                <RefList refs={SPEND_CONTROLS} />
                <h3 className="fx-h5" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}><Users size={22} /> Buying together</h3>
                <RefList refs={GROUP_BUYING} />
                <h3 className="fx-h5" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}><Landmark size={22} /> Hedera</h3>
                <RefList refs={HEDERA} />
              </div>
            </div>
            <p className="fx-xs" style={{ marginTop: 30, textAlign: 'center', color: 'var(--fx-slate)' }}>
              Figures in the demo are illustrative. Nothing on this page is an endorsement of Coquire by the people quoted. <Link to="/docs/overview">How the mechanism works</Link>.
            </p>
          </Container>
        </Section>
      </main>
      <Footer current="/use-cases" />
    </div>
  );
}
