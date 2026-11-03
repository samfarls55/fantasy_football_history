# Final checkpoint: stale original-logo exception

The home page is built and browser-tested. The finish reviewer returned `ship` after scoring the numeric-lettering fix resolved. The final Impeccable state remains at `responsive`, with `finish` unset.

The original Monkey Buccaneers logo is unchanged. Sam explicitly authorized it: "The mockup can differ for the logo; keep the original". The native tool accepted that exception during the plates phase.

Later `font-match` commands updated text-measurement metadata in the spec. Impeccable hashes every spec region into each plate's reference hash, so this invalidated the existing logo exception even though the logo, its box, and the comp did not change. Revalidation replaced the forced plate receipt with an invalid receipt.

Applying the same authorized exception through `build-phase advance --force --reason ...` at responsive closes the phase, but it does not restamp the plate exception or record a responsive input hash. `build-phase finish --disposition ship` therefore reopens responsive. Advancing it repeats the same logo rejection.

The supported commands provide no way to renew a plate exception in place after its phase closes. Build state and review receipts have not been edited manually. The accepted comp and source logo have not been changed to satisfy the checker.

The relevant implementation is in [build_phase.rs](https://github.com/pbakaus/impeccable/blob/df3a4abe7d0840d5f60324812c432e00b66a4e75/crates/comp-verbs/src/build_phase.rs): `plate_reference_hash` hashes all regions; `revalidate_plates` replaces stale receipts; `advance` calls `stamp_forced_plates` only during plates; `gate_responsive` records its input hash only after a successful gate.

Final visual evidence remains in `diff/final` and `diff/final-native`, both approximately 92% overall. The native paired crops and all fourteen captures were reviewed. `finish-verdict.md` records the ship verdict for the resolved lettering fix. Six Playwright tests passed, Astro reported no type errors, warnings, or hints, and the production build succeeded. A provenance scan found ten rasters and zero missing origins.

The functional preview is running at http://127.0.0.1:4322/ with synthetic statistics clearly labeled. The Sleeper importer is outside this home-page build.
