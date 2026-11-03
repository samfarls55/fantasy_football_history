// Original retained pixels, traced to the source upload URL rather than a name/year.
// These are current owner/team images, never historical identity or NFL player portraits.
const originalArtwork: Record<string, string> = {
  'https://sleepercdn.com/uploads/3cb1a2249156178e5a7d372b7e34b83f.jpg': '/assets/plates/achievement-logo.png',
  'https://sleepercdn.com/uploads/50ad7a3e74ca1dd81d358601df4c9b9f.jpg': '/assets/plates/bench-portrait.png',
};

export function ownerArtwork(custom: unknown, account: string | null): string | null {
  if (typeof custom === 'string') {
    try {
      const url = new URL(custom);
      if (url.protocol === 'https:' || url.protocol === 'http:') return originalArtwork[url.href] ?? url.href;
    } catch { /* An unsupported optional custom image falls back to the account avatar. */ }
  }
  return account ? `https://sleepercdn.com/avatars/${encodeURIComponent(account)}` : null;
}
