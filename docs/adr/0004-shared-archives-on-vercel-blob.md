# ADR 0004: Shared archives on Vercel Blob

Status: accepted, November 24, 2026. Supersedes the storage part of [ADR 0002](0002-on-demand-league-imports.md).

On Vercel each function instance kept archives in its own `/tmp`, so every new instance imported a league again while its visitor waited about 3 seconds.

When `BLOB_READ_WRITE_TOKEN` is present, archives and the Sleeper player list live in a private Vercel Blob store, through `src/history/files.ts`. Without it, the file store works as before, which is what local development and tests use. The store is `rafters` in iad1, beside the functions, connected to the `rafters` project's production and preview environments. Connecting it set the token.

- A write replaces one blob whole, so a reader gets the old archive or the new one. A failed refresh writes nothing.
- Reads skip Blob's CDN cache. A cached read can return the previous archive for a minute after a refresh, which would import the league again.
- An instance holds the last league it read, parsed, and answers from it until the archive is 12 hours old. So a league's first page in an instance reads the store and the rest don't, and what a read works out once is kept beside the archive. One league is held; another one replaces it.
- A store that can't be read is a failed visit, like a failed first import.
- Files are gzipped. The reference archive falls from 3.6 MB to 340 KB and the player list from 14.7 MB to 2.1 MB.
- The player list is a day old at most, by its upload time. Two instances that find it or a league missing at the same moment both fetch it, and either result is complete.

Production and previews share the store, so blob names start with the Vercel environment: `production/<league id>.json.gz` and `preview/<league id>.json.gz`. A preview can't change what production reads. Previews do share archives with each other, so a branch that changes the archive's shape must raise its version. The production code live when the store was connected doesn't read Blob and is unaffected.

The Hobby plan includes 10,000 reads, 2,000 writes and 10 GB of transfer a month. Reads are cold instances, an instance changing league, and a held archive reaching 12 hours; the pages between them are free. Over the limit, Blob refuses requests for 30 days; removing `BLOB_READ_WRITE_TOKEN` and redeploying returns the site to `/tmp`.
