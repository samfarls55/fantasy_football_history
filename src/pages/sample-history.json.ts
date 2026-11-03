import { sampleHistory } from '../../assets/data/sample-history';

export function GET() {
  return new Response(JSON.stringify(sampleHistory, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
