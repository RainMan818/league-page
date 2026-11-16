// Which player card is open (one card for the whole site, mounted in src/routes/+layout.svelte).
// Any element with data-player-id="<Sleeper ID>" opens it (the card listens for clicks on the page), so pages only
// add the attribute; openPlayerCard is for code that opens it directly.
export const playerCard = $state({ id: null });

export const openPlayerCard = (id) => {
    if (id != null && id !== '' && id !== '0') playerCard.id = String(id);
};

export const closePlayerCard = () => {
    playerCard.id = null;
};
