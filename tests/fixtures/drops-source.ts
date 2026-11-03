import { pickupsSource } from './pickups-source.ts';

/** Synthetic repeated drops: another person's later starts survive the dropper's reacquisition. */
export function dropsSource(base: any) {
  const source = pickupsSource(base);
  const id = source.seedLeagueId;
  source.responses[`league/${id}/transactions/6`].push({ transaction_id: '950000000000000001', leg: 6, type: 'free_agent', status: 'complete', status_updated: 2000, adds: null, drops: { '50': 7 } });
  // This arrival has no matching source drop: its implicit ownership closure is not a drop candidate.
  source.responses[`league/${id}/transactions/7`] = [{ transaction_id: '950000000000000002', leg: 7, type: 'free_agent', status: 'complete', status_updated: 2001, adds: { '50': 10, '90': 10 }, drops: null }];
  source.responses[`league/${id}/transactions/3`].push({ transaction_id: '950000000000000003', leg: 3, type: 'free_agent', status: 'failed', status_updated: 1998, adds: null, drops: { '50': 7 } });
  source.responses[`league/${id}/transactions/3`].push({ transaction_id: '950000000000000004', leg: 3, type: 'free_agent', status: 'unknown', status_updated: 1999, adds: null, drops: { '50': 7 } });
  return source;
}
