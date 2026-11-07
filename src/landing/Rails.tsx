import type { ReactNode } from 'react';
import { ArrowRight, BadgeDollarSign, Boxes, Building2, FileSignature, FileText, Landmark, Laptop, Lock, LockOpen, Receipt, ShieldCheck, Sparkles, User, Users } from 'lucide-react';
import { Container, PreTitle, Section, Ticker } from './fx';
import { CoquireMark } from './Nav';

const FX = '/fx/';

/* ---------- logos: real marks where a public icon exists, typographic wordmarks otherwise ---------- */
type LogoName = 'hedera' | 'x402' | 'usdc' | 'arkiv' | 'ccip' | 'sepolia' | 'metamask' | 'tesseract' | 'ecies' | 'sqlite' | 'express';
const LOGOS: Record<LogoName, { label: string; img?: string; word?: boolean; mark?: string; c?: 'blue' | 'green' | 'orange' }> = {
  hedera: { label: 'Hedera', img: '/logos/hedera.svg' },
  x402: { label: 'x402', img: '/logos/x402.svg', word: true },
  usdc: { label: 'USDC', img: '/logos/circle.svg' },
  arkiv: { label: 'Arkiv', img: '/logos/arkiv.svg' },
  ccip: { label: 'Chainlink CCIP', img: '/logos/chainlink.svg' },
  sepolia: { label: 'Ethereum Sepolia', img: '/logos/ethereum.svg' },
  metamask: { label: 'MetaMask', img: '/logos/metamask.svg' },
  tesseract: { label: 'tesseract.js', img: '/logos/tesseract.png' },
  ecies: { label: 'ECIES', img: '/logos/ecies.svg' },
  sqlite: { label: 'SQLite', img: '/logos/sqlite.svg' },
  express: { label: 'Express', img: '/logos/express.svg' },
};
export function Logo({ name, lg }: { name: LogoName; lg?: boolean }) {
  const l = LOGOS[name];
  return (
    <span className={`cq-logo${lg ? ' cq-logo-lg' : ''}`}>
      {l.word ? <img className="cq-logo-word" src={l.img} alt={l.label} /> : l.img ? <img src={l.img} alt="" /> : <span className="cq-logo-mark" data-c={l.c}>{l.mark}</span>}
      {!l.word && l.label}
    </span>
  );
}
function By({ names }: { names: LogoName[] }) {
  return <div className="cq-by">by {names.map((n) => <Logo key={n} name={n} />)}</div>;
}

/* ---------- logo ticker under the hero ---------- */
export function BuiltOnTicker() {
  const names: LogoName[] = ['hedera', 'x402', 'usdc', 'arkiv', 'ccip', 'sepolia', 'metamask', 'tesseract'];
  return (
    <section className="fx-sec fx-clients" aria-label="Built on">
      <Container>
        <div className="fx-clients-in">
          <div className="fx-clients-fade fx-clients-fade-l" aria-hidden />
          <div className="fx-clients-fade fx-clients-fade-r" aria-hidden />
          <div className="fx-clients-pre"><PreTitle>Built on public rails · Hedera testnet</PreTitle></div>
          <Ticker gap={60} duration={40}>
            {names.map((n) => <Logo key={n} name={n} lg />)}
          </Ticker>
          <div className="fx-clients-line" aria-hidden />
        </div>
      </Container>
    </section>
  );
}

/* ---------- use cases with the pieces each one uses ---------- */
const CASES: { icon: ReactNode; t: string; d: string; by: LogoName[]; photo: string }[] = [
  { icon: <FileText size={22} />, t: 'Pool an invoice backlog', d: 'Two bookkeeping teams get one OCR quote for 200 pages and pay per page from separate budgets.', by: ['x402', 'hedera', 'tesseract'], photo: 'QJxW9eYj0OFH6UvNuY4WNkVNJ0.jpg' },
  { icon: <Building2 size={22} />, t: 'Close the month across an agency', d: 'An agency and its subcontractors digitise receipts under one quote; each party\'s agent pays its own pages.', by: ['usdc', 'arkiv'], photo: 'ir92iMEO3JaF66SNrwrpEtYCY.jpg' },
  { icon: <Landmark size={22} />, t: 'Approve from a treasury on another chain', d: 'A DAO treasury on Ethereum approves a spend cap once; the guard on Hedera reads it before every co-signature.', by: ['ccip', 'sepolia', 'hedera'], photo: 'nkS8pAWPKcD8U7ncGVFOqXVV0o.jpg' },
  { icon: <Boxes size={22} />, t: 'Fill supplier capacity', d: 'A vendor quotes combined volume and sees funded balances before signing. Payment arrives per call.', by: ['arkiv', 'x402'], photo: 'omPOmfMdMLLw0U7G41FgZY7Cfmg.jpg' },
  { icon: <ShieldCheck size={22} />, t: 'Give an agent a limit, not a key', d: 'Finance ops signs one permission per order. Every settled call shows four checks; every decline names its reason.', by: ['metamask', 'hedera'], photo: 'l4todGvJ7jL3WhxngE8F0mr2mks.jpg' },
  { icon: <Lock size={22} />, t: 'Keep the files out of the ledger', d: 'Pages are sealed for the supplier, results for your team. The order is public; the contents never are.', by: ['ecies', 'arkiv'], photo: 'rF4nkbqTtccZBPQrR1TG1yKqD8.jpg' },
];
export function UseCaseGrid() {
  return (
    <Section id="use-cases-grid" className="fx-pad-t">
      <Container>
        <div className="fx-top">
          <PreTitle>Use cases</PreTitle>
          <h2 className="fx-h2 fx-center">What teams do with a group order</h2>
          <p className="fx-body fx-center">Each card names the rails it runs on. Nothing here needs a Coquire account to verify.</p>
        </div>
        <div className="cq-cases">
          {CASES.map((c) => (
            <div key={c.t} className="cq-case">
              <img src={FX + c.photo} alt="" className="cq-case-photo" aria-hidden />
              <span className="cq-case-ic">{c.icon}</span>
              <div className="cq-case-t">{c.t}</div>
              <p className="cq-case-d">{c.d}</p>
              <By names={c.by} />
            </div>
          ))}
        </div>
        <p className="fx-sm fx-center" style={{ marginTop: 40, color: 'var(--fx-silver)' }}>Any workload that is one API call per unit works the same way.</p>
      </Container>
    </Section>
  );
}

/* ---------- how it works: three diagrams built from primitives ---------- */
function PoolDiagram() {
  const nodes = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div className="cq-how-diag">
      <span className="cq-hub"><span className="cq-hub-glow" /><CoquireMark size={64} light /></span>
      {nodes.map((a) => {
        const r = 125; const rad = (a * Math.PI) / 180;
        const x = Math.cos(rad) * r, y = Math.sin(rad) * r;
        return (
          <span key={a}>
            <span className="cq-node-l" style={{ left: 'calc(50% + 0px)', top: '50%', width: r - 24, transform: `rotate(${a}deg)` }} />
            <span className="cq-node" style={{ left: `calc(50% + ${x}px - 24px)`, top: `calc(50% + ${y}px - 24px)` }}>{a % 90 === 0 ? <User size={18} /> : <Laptop size={18} />}</span>
          </span>
        );
      })}
    </div>
  );
}
function QuoteDiagram() {
  return (
    <div className="cq-how-diag">
      <span className="cq-orbit" />
      <span className="cq-hub" data-dark="true"><CoquireMark size={64} /></span>
      <span className="cq-card-stack" style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}><FileSignature size={20} />Signed quote</span>
      <span className="cq-card-stack" style={{ bottom: 20, left: 0 }}><BadgeDollarSign size={20} />Group rate</span>
      <span className="cq-card-stack" style={{ bottom: 20, right: 0 }}><Receipt size={20} />Reservation fee</span>
    </div>
  );
}
function PayDiagram() {
  return (
    <div className="cq-how-diag cq-pay-diag">
      <span className="cq-hub cq-pay-hub" data-dark="true"><span className="cq-hub-glow" /><CoquireMark size={44} /></span>
      <span className="cq-pay-link" />
      <span className="cq-rails-grid cq-pay-grid">
        <span><Logo name="hedera" /></span><span><Logo name="x402" /></span>
        <span><Logo name="usdc" /></span><span><Logo name="arkiv" /></span>
        <span><Logo name="ccip" /></span><span><Logo name="metamask" /></span>
      </span>
    </div>
  );
}
export function HowItWorksDiagram() {
  return (
    <Section id="how-it-works" className="fx-steps" style={{ paddingTop: 200 }}>
      <Container>
        <div className="fx-top">
          <h2 className="fx-h2 fx-center">How it works</h2>
        </div>
        <div className="cq-how">
          <div className="cq-how-step">
            <PoolDiagram />
            <div><div className="cq-how-n">01</div><div className="cq-how-t">Pool the demand</div></div>
            <p className="cq-how-d">Teams commit their own pages and their own limits to one order.</p>
          </div>
          <div className="cq-how-arrow"><ArrowRight size={28} strokeWidth={1.5} /></div>
          <div className="cq-how-step">
            <QuoteDiagram />
            <div><div className="cq-how-n">02</div><div className="cq-how-t">Suppliers quote once</div></div>
            <p className="cq-how-d">One signed quote for the combined volume. The group approves it.</p>
          </div>
          <div className="cq-how-arrow"><ArrowRight size={28} strokeWidth={1.5} /></div>
          <div className="cq-how-step">
            <PayDiagram />
            <div><div className="cq-how-n">03</div><div className="cq-how-t" data-accent="true">Agents pay per call</div></div>
            <p className="cq-how-d">Under a limit you signed once, with a guard that co-signs every call.</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ---------- built on: each piece and what it does ---------- */
const RAILS: { name: LogoName; role: string; tag: string }[] = [
  { name: 'hedera', role: 'Settlement network, 3–5 s finality, fixed fees', tag: 'testnet' },
  { name: 'x402', role: 'HTTP 402 pay-per-call protocol', tag: 'exact scheme' },
  { name: 'usdc', role: 'Stablecoin the agents pay in', tag: '0.0.429274' },
  { name: 'arkiv', role: 'Order and quote discovery with expiry', tag: 'rabdi testnet' },
  { name: 'ccip', role: 'Treasury approval from another chain', tag: 'sepolia → hedera' },
  { name: 'metamask', role: 'Sign-in and one permission per order', tag: 'chain 296' },
  { name: 'tesseract', role: 'Real OCR inside the built-in supplier', tag: 'in process' },
  { name: 'ecies', role: 'Sealed pages and results, secp256k1', tag: 'noble' },
];
export function BuiltOn() {
  return (
    <Section className="fx-pad-t" style={{ paddingBottom: 100 }}>
      <Container>
        <div className="fx-top" style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 className="fx-h2 fx-center">Every piece is public. <span style={{ color: 'var(--fx-indigo)' }}>Coquire is one client.</span></h2>
          <p className="fx-body fx-center">What we use and what each piece does. These are technologies we build on, not endorsements.</p>
        </div>
        <div className="cq-builton">
          <div className="cq-builton-row">
            {RAILS.slice(0, 4).map((r) => (
              <div key={r.name} className="cq-builton-cell"><Logo name={r.name} lg /><span className="cq-builton-role">{r.role}</span><span className="cq-builton-tag">{r.tag}</span></div>
            ))}
          </div>
          <div className="cq-builton-row">
            {RAILS.slice(4).map((r) => (
              <div key={r.name} className="cq-builton-cell"><Logo name={r.name} lg /><span className="cq-builton-role">{r.role}</span><span className="cq-builton-tag">{r.tag}</span></div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ---------- privacy flow ---------- */
export function PrivacyFlow() {
  const teams = ['Northwind Books', 'Harbor Ledger', 'Birch Accounting', 'Pinewood Studio', 'Atlas Media'];
  return (
    <Section id="security" className="fx-pad-t">
      <Container>
        <div className="fx-top">
          <PreTitle>Privacy</PreTitle>
          <h2 className="fx-h2 fx-center">Share the order. Keep the work separate.</h2>
          <p className="fx-body fx-center">The order is public so suppliers can find it. The files are sealed so nobody else can read them. Coquire stores ciphertext it cannot open.</p>
        </div>
        <div className="cq-priv">
          <div className="cq-priv-diag" aria-hidden>
            <span className="cq-priv-lbl" style={{ left: 28 }}>Buyer teams</span>
            <span className="cq-priv-lbl" style={{ right: 28 }}>Supplier</span>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 1000 460" preserveAspectRatio="none">
              {teams.map((_, i) => { const y = 91 + i * 70; return <path key={i} d={`M 300 ${y} C 400 ${y}, 420 230, 500 230`} fill="none" stroke="#DDE5ED" strokeWidth="2" vectorEffect="non-scaling-stroke" />; })}
              {teams.map((_, i) => { const y = 91 + i * 70; return <path key={'b' + i} d={`M 300 ${y} C 400 ${y}, 420 230, 500 230`} fill="none" stroke="#406AE4" strokeWidth="2.5" strokeDasharray="22 240" strokeDashoffset={i * 37} vectorEffect="non-scaling-stroke" />; })}
              <path d="M 500 230 L 700 230" stroke="#406AE4" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>
            {teams.map((t, i) => (
              <span key={t} className="cq-priv-team" style={{ left: 28, top: 78 + i * 70 }}><i>{t[0]}</i>{t}</span>
            ))}
            <span className="cq-priv-hub"><CoquireMark size={40} /><b>coquire</b><span>guard · ledger · index</span></span>
            <span className="cq-priv-right" style={{ top: 188 }}><Lock size={16} /><span>Sealed pages<br /><small>FOR THE SUPPLIER KEY</small></span></span>
            <span className="cq-priv-right" style={{ top: 252 }}><Lock size={16} /><span>Sealed results<br /><small>FOR YOUR AGENT KEY</small></span></span>
            <span className="cq-priv-right" style={{ top: 330 }}><LockOpen size={16} style={{ color: 'var(--fx-slate)' }} /><span style={{ color: 'var(--fx-slate)' }}>Terms, volume, payments<br /><small>PUBLIC ON HEDERA AND ARKIV</small></span></span>
          </div>
          <div className="cq-priv-list">
            <div className="cq-priv-item"><span className="cq-priv-item-ic"><Lock size={18} /></span><div><div className="cq-priv-item-t">Pages are sealed in your browser</div><div className="cq-priv-item-d">ECIES over secp256k1 to the approved supplier's key, before anything is uploaded. Other buyers in the group never see them.</div></div></div>
            <div className="cq-priv-item"><span className="cq-priv-item-ic"><Lock size={18} /></span><div><div className="cq-priv-item-t">Results are sealed to your agent key</div><div className="cq-priv-item-d">The supplier encrypts each result for the key that paid for it. Only your browser can open it.</div></div></div>
            <div className="cq-priv-item" data-public="true"><span className="cq-priv-item-ic"><Users size={18} /></span><div><div className="cq-priv-item-t">The order itself is public, on purpose</div><div className="cq-priv-item-d">Terms, combined volume, funded balances and per-call payments are visible on Arkiv and Hedera, so suppliers can quote and auditors can verify without asking us.</div></div></div>
            <div className="cq-priv-item"><span className="cq-priv-item-ic"><Sparkles size={18} /></span><div><div className="cq-priv-item-t">What a watcher learns</div><div className="cq-priv-item-d">How many calls you paid for and when. Not what was in them, and not what came back.</div></div></div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
