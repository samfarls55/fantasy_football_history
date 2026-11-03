# Record navigation comparison

Design question Q4: what should happen when a visitor opens a record?

- A: go directly to the relevant matchup, with the recorded player highlighted.
- B: open a short record page, then choose Open matchup.
- C: expand an inline preview in the record book, then choose Open matchup.

The three mockups are in `.impeccable/mocks` inside this prototype folder. They use synthetic results and the accepted home-page visual system. Their prompt sidecars record the built-in image-generation prompts and source references. Team artwork in the final application remains the original sourced artwork.

Decision: Sam selected B. A record opens a category page showing the top people/results in that category. Ranking semantics and entry-level navigation are being resolved in the walkthrough. These are visual mockups for the interview, with no change to the application code. Questions stay in chat. Public calculation panels and operational status displays are excluded; page-local filter behavior is settled.
