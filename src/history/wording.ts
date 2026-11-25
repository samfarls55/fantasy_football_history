/** "1 week", "3 weeks". */
export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
/** "7–3", with the ties only when there are any. */
export const winLoss = (wins: number, losses: number, ties: number) => [wins, losses, ...ties ? [ties] : []].join('–');
