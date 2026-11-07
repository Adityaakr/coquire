import { Link } from 'react-router-dom';
import { Badge, Bento } from '@/ui';
import { useStore } from '@/store/store';
import { orderStatus, totalCalls } from '@/domain/selectors';
import { Countdown, Empty, Money, Note, StatusBadge, Th } from './kit';

export function DiscoverPage() {
  const { state, myTeam, me } = useStore();
  const listings = state.orders.filter((o) => o.arkivListingId && o.status === 'open' && orderStatus(o) !== 'expired');
  const live = !!me?.arkiv.live;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div><h1 className="px-h1">Market</h1><p className="px-lead">Funded group orders. Join one as a buyer, or quote it as a supplier.</p></div>
      <Bento variant="app" pad={0}>
        <div style={{ padding: '20px 26px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18 }}>Open orders{live ? ' on Arkiv' : ''}</span>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Funded requests with a defined workload, volume and deadline. Each listing expires when its offer window ends.</div>
          </div>
          <Badge size="sm" tone={live ? 'ok' : 'neutral'}>{live ? 'Rabdi testnet' : 'local index'}</Badge>
        </div>
        {listings.length === 0 ? <Empty title="No open listings" body="Orders appear here while their offer window is open." /> : (
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead><tr><Th>Order</Th><Th>Volume</Th><Th>Funded balances</Th><Th>Quotes</Th><Th>Expires</Th><Th>Entity</Th></tr></thead>
              <tbody>
                {listings.map((o) => {
                  const funded = o.teams.reduce((a, t) => a + (state.teams.find((x) => x.id === t.teamId)?.balance ?? 0n), 0n);
                  const mine = o.teams.some((t) => t.teamId === myTeam?.id);
                  const url = live && !o.arkivListingId!.startsWith('local_') ? `${me!.arkiv.explorer}/entity/${o.arkivListingId}` : '';
                  return (
                    <tr key={o.id} className="ap-row">
                      <td>
                        <Link to={`/app/orders/${o.id}`} style={{ fontWeight: 600 }}>{o.title}</Link>
                        <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}><StatusBadge status={orderStatus(o)} />{mine && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>your team is in this group</span>}</div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{totalCalls(o)} pages · {o.teams.length} teams</td>
                      <td><Money value={funded} /></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{o.quotes.length}</td>
                      <td style={{ color: 'var(--text-2)' }}><Countdown until={o.offerWindowEnd} /></td>
                      <td>{url ? <a href={url} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' }}>{o.arkivListingId!.slice(0, 12)}…</a> : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>{o.arkivListingId}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Bento>
      <Note>{live ? 'Entities are written to Arkiv Rabdi testnet with an expiry equal to the offer window.' : 'Listings are indexed locally until Arkiv credentials are configured on the server.'}</Note>
    </div>
  );
}
