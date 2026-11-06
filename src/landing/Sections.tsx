import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeftRight, Boxes, Coins, FileCheck, Globe, KeyRound, Layers, Lightbulb, Link2, Lock, Receipt, Repeat, Rocket, ShieldCheck, Sparkles, Timer, Users, Wallet, Zap } from 'lucide-react';
import { TokenIcon } from '@/ui';
import { CoquireMark } from './Nav';
import { Badge, BgItem, Btn, BtnIcon, Container, FounderCard, ListItem, OverviewCard, PreTitle, Section, Shot, StatItem, StatLGCard, StepSwitcher, TestimonialItem, Ticker, UseCaseCard } from './fx';

const FX = '/fx/';

/* ---------- Comparison: before / after ---------- */
export function Comparison() {
  const [side, setSide] = useState<'before' | 'after'>('before');
  const spacer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = spacer.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSide('after'); }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const before = ['Each team pays the list rate for its own small volume', 'Suppliers see one tiny order and price it high', 'Every API call runs on a key with no spending limit', 'No way to prove what the agent was allowed to pay'];
  const after = ['Two teams, one quote, the group rate for everyone', 'Suppliers see combined demand and funded balances', 'Your agent pays per call under a limit you signed once', 'The guard refuses anything outside the approved terms'];
  return (
    <Section id="products" className="fx-compare">
      <Container max={760} className="fx-compare-wrap">
        <div className="fx-compare-in">
          <h2 className="fx-h2">Smarter API buying starts with a bigger order</h2>
          <div className="fx-ba" data-side={side}>
            <div className="fx-ba-tabs" role="tablist">
              <div className="fx-ba-overlay-top" aria-hidden />
              <button type="button" role="tab" className="fx-ba-tab" data-side="before" aria-selected={side === 'before'} onClick={() => setSide('before')}>Before Coquire</button>
              <span className="fx-ba-knob" aria-hidden><img src={`${FX}BepIwACX380EUEqBMK5sdcQgh3k.png`} alt="" width={130} /></span>
              <button type="button" role="tab" className="fx-ba-tab" data-side="after" aria-selected={side === 'after'} onClick={() => setSide('after')}>After Coquire</button>
            </div>
            <div className="fx-ba-frame">
              <div className="fx-ba-panel">
                <div className="fx-ba-desc">
                  <h3>{side === 'before' ? 'Buying API capacity alone today' : 'Buying it together, paying separately'}</h3>
                  <div className="fx-ba-list">
                    {(side === 'before' ? before : after).map((t) => <ListItem key={t} variant="lg" icon={side === 'before' ? 'x' : 'chevron'} color={side === 'after' ? '#BABABA' : undefined}>{t}</ListItem>)}
                  </div>
                </div>
                <div className="fx-ba-stats">
                  {(side === 'before' ? [['0.06 USDC', 'List rate per page'], ['100%', 'Of the budget trusted to an API key']] : [['0.045 USDC', 'Group rate per page'], ['4 checks', 'Before every co-signature']]).map(([b, s]) => (
                    <div key={b} className="fx-ba-statcard"><b>{b}</b><span>{s}</span></div>
                  ))}
                </div>
                <div className="fx-ba-bg" aria-hidden><img src={`${FX}Osh2UHQcarC8mZnL6oh6gwYnbA.jpg`} alt="" /></div>
              </div>
            </div>
          </div>
        </div>
      </Container>
      <div ref={spacer} className="fx-compare-spacer" aria-hidden />
    </Section>
  );
}

/* ---------- Features bento ---------- */
const WORDS: [string, string][] = [['Quote', '#F28778'], ['Sign', '#8AE389'], ['Settle', '#FDBB6E']];
function FeatureBoxTitle() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % WORDS.length), 2600); return () => clearInterval(t); }, []);
  return (
    <div className="fx-fbt" aria-hidden>
      {WORDS.map(([w, c], k) => (
        <div key={w} className="fx-fbt-word" data-on={k === i} style={{ color: c }}>{w}<i>{w}</i></div>
      ))}
    </div>
  );
}

export function Features() {
  return (
    <Section id="features" className="fx-features">
      <Container>
        <div className="fx-features-head">
          <div>
            <PreTitle>Core features</PreTitle>
            <h2 className="fx-h2">Everything you need to buy together without sharing a budget</h2>
          </div>
          <div>
            <p className="fx-body">Procurement-grade tooling for teams that buy API capacity and the suppliers that quote it.</p>
            <BtnIcon variant="dark" to="/product">View all features</BtnIcon>
          </div>
        </div>
        <div className="fx-features-grid">
          <div className="fx-features-left">
            <div className="fx-fcard">
              <h3>A guard with four checks</h3>
              <img src={`${FX}wXWMCe97v6E9fhERLabXGgt0Go.png`} alt="" style={{ maxWidth: 150, position: 'relative', zIndex: 1 }} />
              <div className="fx-fcard-badges">
                <Badge variant="white">Supplier</Badge>
                <Badge variant="white">Rate</Badge>
                <Badge variant="white">Request ID</Badge>
                <Badge variant="white">Allowance</Badge>
              </div>
            </div>
            <div className="fx-fcard">
              <h3>A rate that drops with volume</h3>
              <img src={`${FX}G7W3uXGEWJ2M7xixcWnVJPdzxEc.svg`} alt="" style={{ width: '100%', position: 'relative', zIndex: 1 }} />
              <BgItem src={`${FX}IZgCL46gW5tJW2TUtUKnT2MFgMs.jpg`} overlay={0.8} />
            </div>
            <div className="fx-fcard fx-fcard-3">
              <div className="fx-fcard-top">
                <h3>The whole order in one view</h3>
                <p>Group, quotes and execution side by side: who committed what, which quote won, and every settled call with its guard checks and receipt.</p>
              </div>
              <div className="fx-fcard-shots">
                <img src={`${FX}LLeScfWulZWyA0jZhMBwmQgQHA.svg`} alt="" style={{ width: 250 }} />
                <img src={`${FX}LP5Ny6NdFTClX39IhTGUIolDygE.svg`} alt="" style={{ width: 300 }} />
              </div>
              <BgItem src={`${FX}subirXJz7lXrSNejZPxoXXA90Ik.jpg`} overlay={0.9} />
            </div>
          </div>
          <div className="fx-features-right">
            <div className="fx-fcard fx-fcard-dark">
              <h3>Every step on public rails</h3>
              <FeatureBoxTitle />
              <p>Quotes signed, permission signed once, calls settled over x402.</p>
            </div>
            <div className="fx-fcard" style={{ minHeight: 0 }}>
              <h3>Guard alerts</h3>
              <div className="fx-alert">
                <img src={`${FX}e7N84L0vlZQpYYqGdndB2EPeKk.svg`} alt="" style={{ width: '100%', top: 0, zIndex: 3 }} />
                <img src={`${FX}qRR37bNghXttLizbZI0gYViJtDE.svg`} alt="" style={{ width: '86%', top: 44, zIndex: 2 }} />
                <img src={`${FX}KeTabRzcIFVfk1ymsNMeghVPnM.svg`} alt="" style={{ width: '72%', top: 76, zIndex: 1 }} />
                <img src={`${FX}dIhxLbN1GBZu7TFHjssn0JUI4kY.png`} alt="" className="fx-alert-bell" />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ---------- Platform overview ---------- */
export function Overview() {
  return (
    <Section className="fx-overview">
      <Container>
        <div className="fx-overview-content">
          <div className="fx-overview-top">
            <div className="fx-top">
              <PreTitle>Platform overview</PreTitle>
              <h2 className="fx-h2 fx-center">See a group order in action</h2>
              <p className="fx-body fx-center">Explore a live order that brings the group, the quotes and your agent's per-call payments together in one clear view.</p>
            </div>
            <div className="fx-buttons">
              <BtnIcon to="/product">Explore features</BtnIcon>
              <Btn variant="dark" to="/app?mode=buyer">Try the live demo</Btn>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, width: '100%' }}>
            <div className="fx-overview-shot"><div><Shot name="app-overview" alt="A Coquire order with its quotes and execution ledger" width={1400} height={846} mobileHeight={760} /></div></div>
            <div className="fx-overview-cards">
              <OverviewCard icon={<Rocket size={20} strokeWidth={2} />} lead="All your orders in one place:">Group, quotes and the per-call ledger together, with your budget and remaining allowance always visible.</OverviewCard>
              <OverviewCard icon={<Zap size={20} strokeWidth={2} />} lead="Pay only as you go:">One signature per order, then your agent pays per page. What it does not spend never leaves your account.</OverviewCard>
              <OverviewCard icon={<Lightbulb size={20} strokeWidth={2} />} lead="Built for auditability:">Every settled call shows its four guard checks and a receipt, and every decline says exactly why.</OverviewCard>
            </div>
          </div>
        </div>
      </Container>
      <BgItem src={`${FX}sGvx8VOXGYVGBocxGp5Wy6GfeA.jpg`} top bottom />
    </Section>
  );
}

/* ---------- How it works ---------- */
const STEPS: [string, string, string][] = [
  ['ykcQXfkRR4KTqMLXTbg0T9PB8zk.png', 'Put your demand together', 'Describe the workload, how many pages, and when you need it. Invite another team. Each team funds its own account.'],
  ['BRYQbNFP21XSdbOpg2tEs4MO0aY.png', 'Test the API, approve one quote', 'Compare rates, fees and delivery windows, run a sample page, then approve the quote. That fixes the price per call and the deadline.'],
  ['nDs3OgbLpR77rcn1GvmpOSivzdI.png', 'Let your agent pay as it goes', 'Sign one permission. Your agent signs each call, the guard checks four things and co-signs, and the facilitator settles USDC on Hedera.'],
];
export function Steps() {
  const [i, setI] = useState(0);
  return (
    <Section id="how-it-works" className="fx-steps">
      <Container>
        <div className="fx-steps-content">
          <div className="fx-steps-left">
            <div className="fx-top-left">
              <PreTitle>How it works</PreTitle>
              <h2 className="fx-h2">From shared request to per-call payment</h2>
              <p className="fx-body">Pool demand with other teams, approve one quote, and pay from your own budget while the guard enforces the terms.</p>
            </div>
            <div className="fx-steps-stats">
              <StatItem title="1 signature" description="Per order, then the agent pays per call" />
              <StatItem title="0 HBAR" description="The facilitator sponsors network fees" />
            </div>
          </div>
          <div className="fx-workflow">
            <StepSwitcher labels={['Step 01', 'Step 02', 'Step 03']} active={i} onChange={setI} />
            <div className="fx-workflow-frame">
              <div className="fx-workflow-panel">
                {STEPS.map(([img, t, d], k) => (
                  <div key={t} className="fx-workflow-step" data-on={k === i}>
                    <img src={FX + img} alt="" />
                    <div className="fx-workflow-desc"><h4>{t}</h4><p className="fx-body">{d}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ---------- Security ---------- */
export function Security() {
  return (
    <Section id="security">
      <Container>
        <div className="fx-split">
          <div className="fx-imgpanel fx-imgpanel-wide"><img src={`${FX}ShWpChwHKJXjkAo8ZPOmvydAuFE.png`} alt="" /></div>
          <div className="fx-split-col fx-split-narrow">
            <div className="fx-top-left">
              <PreTitle>Privacy &amp; control</PreTitle>
              <h2 className="fx-h2">Share the order. Keep the work separate.</h2>
              <div style={{ marginTop: 10 }}><BtnIcon variant="dark" to="/app?mode=buyer">Get started now</BtnIcon></div>
            </div>
            <div className="fx-split-list">
              <ListItem>Invoice pages encrypted for the approved supplier only</ListItem>
              <ListItem>Results encrypted for your team only</ListItem>
              <ListItem>Other buyers see the order terms, never the files</ListItem>
              <ListItem>Wallet addresses and per-call payments stay public on Hedera</ListItem>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ---------- Use cases ---------- */
const CASES: [string, string, string, string, string][] = [
  ['Bookkeeping teams', 'Pool an invoice backlog with another team, approve one OCR quote, and let your agent pay per page from your own budget.', '0.75 USDC', 'Saved on 150 pages in the worked example', 'l4todGvJ7jL3WhxngE8F0mr2mks.jpg'],
  ['API suppliers', 'See funded group orders with a defined workload, volume and deadline. Quote once against the combined volume.', '200 pages', 'Quoted as one order instead of two', 'rF4nkbqTtccZBPQrR1TG1yKqD8.jpg'],
  ['Finance ops', 'Give an agent a signed limit per order and read every settled call, with its guard checks, in one ledger.', '4 checks', 'Supplier, rate, request ID, allowance', 'Rl52kJV49NxXXh2BR2NJhjJuN7I.jpg'],
  ['Agent builders', 'Discover funded orders on Arkiv, settle calls over x402, and read the treasury approval the guard checks.', '1 file', 'Swaps the simulated adapters for live ones', 'nPSRrYomcOALmLPJavAfjBIboI.jpg'],
];
const PHOTOS = ['QJxW9eYj0OFH6UvNuY4WNkVNJ0.jpg', 'ir92iMEO3JaF66SNrwrpEtYCY.jpg', 'nkS8pAWPKcD8U7ncGVFOqXVV0o.jpg', 'omPOmfMdMLLw0U7G41FgZY7Cfmg.jpg'];
export function UseCases() {
  return (
    <Section id="use-cases" className="fx-usecases">
      <div className="fx-top">
        <PreTitle>Who it is for</PreTitle>
        <h2 className="fx-h2 fx-center">Built for the teams that buy, and the suppliers that quote</h2>
      </div>
      <div className="fx-usecases-ticker">
        <Ticker gap={10} duration={60}>
          {CASES.map(([t, d, st, sd, bg], k) => [
            <img key={`p${k}`} src={FX + PHOTOS[k]} alt="" className="fx-usecase-photo" />,
            <UseCaseCard key={t} title={t} description={d} statsTitle={st} statsDescription={sd} bg={FX + bg} />,
          ])}
        </Ticker>
      </div>
      <div className="fx-usecases-bottom">
        <div className="fx-badges">
          <Badge>2+ teams per order</Badge><Badge>4 guard checks</Badge><Badge>Testnet demo</Badge><Badge>Simulated settlement</Badge>
        </div>
        <FounderCard content="“We built Coquire so two small teams can get the price of one big customer, without pooling a budget or sharing a single file.”" avatar={`${FX}7Z2d6WeDiCpoz0B6ookMTPOFAU.jpg`} jobTitle="Founder" />
      </div>
    </Section>
  );
}

/* ---------- Integrations ---------- */
const RING: ReactNode[] = [
  <TokenIcon token="USDC" size={32} />, <Wallet size={30} color="#406AE4" />, <Receipt size={30} color="#1D1D1D" />, <ArrowLeftRight size={30} color="#10B981" />,
  <KeyRound size={30} color="#FF8B06" />, <Boxes size={30} color="#5290F4" />, <Link2 size={30} color="#F28778" />, <Repeat size={30} color="#8AE389" />,
  <TokenIcon token="HBAR" size={32} />, <Globe size={30} color="#3B82F6" />, <FileCheck size={30} color="#FDBB6E" />, <Layers size={30} color="#1D1D1D" />,
  <ShieldCheck size={30} color="#10B981" />, <Coins size={30} color="#FDBB6E" />, <Lock size={30} color="#F51C23" />, <Sparkles size={30} color="#8AE389" />,
];
export function Integrations() {
  return (
    <Section id="integrations">
      <Container>
        <div className="fx-integrations-card">
          <div className="fx-integrations-top">
            <div className="fx-top">
              <PreTitle variant="white">Developers</PreTitle>
              <h2 className="fx-h2 fx-center">Use the same order from your own app</h2>
              <p className="fx-body fx-center">Orders and signed quotes live on Arkiv, calls settle on Hedera over x402, and a Chainlink CCIP message can carry a treasury approval across. Coquire is one client for them.</p>
            </div>
            <BtnIcon href="https://docs.hedera.com/solutions/ai/x402" newTab>Read the x402 docs</BtnIcon>
          </div>
          <div className="fx-ring-wrap">
            <div className="fx-ring" aria-hidden>
              {RING.map((ic, k) => <span key={k} className="fx-ring-item" style={{ '--a': `${k * 22.5}deg` } as CSSProperties}><span>{ic}</span></span>)}
            </div>
            <div className="fx-ring-center">
              <span className="fx-ring-core"><CoquireMark size={56} /></span>
              <h3 className="fx-h6">Discover on Arkiv. Settle on Hedera. Approve from another chain.</h3>
            </div>
          </div>
          <img src={`${FX}XlxsE037ei7LGhxYPQDC3jctO9A.png`} alt="" className="fx-integrations-bg" aria-hidden />
        </div>
      </Container>
    </Section>
  );
}

/* ---------- Stats ---------- */
const STATS: { pre: string; title: string; desc: string; icon: ReactNode; variant: 'default' | 'dark' | 'primary'; pos: CSSProperties }[] = [
  { pre: 'Pages in the demo order', title: '200', desc: 'Two teams, 150 and 50, quoted as one order.', icon: <Users size={20} />, variant: 'default', pos: { left: 50, top: 130 } },
  { pre: 'Group rate per page', title: '0.045', desc: 'USDC, down from a 0.06 list rate.', icon: <Coins size={20} />, variant: 'dark', pos: { right: 0, top: 120 } },
  { pre: 'Saved across the group', title: '1.00', desc: 'USDC against buying alone, fee included.', icon: <Sparkles size={20} />, variant: 'dark', pos: { left: 20, top: 620 } },
  { pre: 'Guard checks per call', title: '4', desc: 'Supplier, rate, request ID, remaining allowance.', icon: <ShieldCheck size={20} />, variant: 'primary', pos: { left: 430, top: 680 } },
  { pre: 'HBAR you need', title: '0', desc: 'The facilitator sponsors network fees.', icon: <Timer size={20} />, variant: 'default', pos: { right: 0, top: 590 } },
];
export function Stats() {
  return (
    <Section className="fx-stats">
      <Container>
        <div className="fx-stats-board">
          <div className="fx-top">
            <PreTitle>By the numbers</PreTitle>
            <h2 className="fx-h2 fx-center">The worked example, in figures</h2>
            <p className="fx-body fx-center">Illustrative pricing from the demo order. Your totals depend on the supplier's quote and how much your agent actually uses.</p>
          </div>
          <div className="fx-stats-grid" style={{ display: 'contents' }}>
            {STATS.map((s) => <StatLGCard key={s.pre} preTitle={s.pre} title={s.title} description={s.desc} icon={s.icon} variant={s.variant} style={s.pos} />)}
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ---------- Testimonials ---------- */
const TESTI: [string, string, string, string][] = [
  ['We had 150 invoices and the team next door had 50. One quote, one rate, two budgets. The agent paid per page and I could read every call.', '7Z2d6WeDiCpoz0B6ookMTPOFAU.jpg', 'Team A', 'Bookkeeping lead · sample persona'],
  ['Quoting 200 pages instead of 50 changed the price I could offer. I saw the funded balances before I signed anything.', 'hYfCvJ3IVdEznEOwIQiiAxWOsPY.jpg', 'ScanWorks OCR', 'Supplier · sample persona'],
  ['I tried to overcharge in the demo and the guard refused to co-sign. That is the control I want before I let an agent spend.', '622M5cyJBdKPIK1fPnBlo3qONk.jpg', 'Finance ops', 'Reviewer · sample persona'],
  ['Unused budget simply never left the account. No refund flow, no ticket, nothing to chase.', 'W13V3WO2YwDah4yBxCcZc70Es.jpg', 'Team B', 'Operations · sample persona'],
  ['Everything an agent needs is on public rails: the order on Arkiv, the quote signed, the calls settled over x402.', '5O8P63EQwkFO1m5OTR4jsw7hI8.jpg', 'Agent builder', 'Developer · sample persona'],
];
export function Testimonials() {
  return (
    <Section className="fx-testimonials">
      <Container>
        <div className="fx-testimonials-head">
          <div>
            <h2 className="fx-h2">What the demo shows each side</h2>
            <div className="fx-hero-list" style={{ justifyContent: 'flex-start' }}>
              <ListItem variant="fit" icon="star">Sample personas</ListItem><span className="fx-line" />
              <ListItem variant="fit" icon="shield">Testnet demo</ListItem><span className="fx-line" />
              <ListItem variant="fit" icon="zap">Illustrative pricing</ListItem>
            </div>
          </div>
          <div><BtnIcon variant="dark" to="/app?mode=buyer">Get started today</BtnIcon></div>
        </div>
      </Container>
      <div className="fx-testimonials-ticker">
        <Ticker gap={50} duration={70} align="end">
          {TESTI.map(([c, av, n, j]) => <TestimonialItem key={n} content={c} avatar={FX + av} name={n} jobTitle={j} />)}
        </Ticker>
      </div>
      <BgItem src={`${FX}cQBpXWVe2IileA0HCzW5W4uvgY.jpg`} top bottom height={420} />
    </Section>
  );
}
