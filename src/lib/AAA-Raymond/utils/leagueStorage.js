// Browser data saved per league (Nov 16), so switching the league in leagueInfo.js never shows another league's
// saved records or transactions. Entries live under "<name>:<league ID>". Copies saved before this under the plain
// name are moved to the league they belong to (`belongs`), or dropped (`dropShared`) when that can't be told.
// Plain functions, no site imports (tested in tests/leagueStorage.test.js); `storage` is localStorage or null.

export const leagueKey = (name, leagueID) => `${name}:${leagueID}`;

/**
 * The saved value of `name` for this league, or null. An old shared copy (plain `name`) is moved to this league's
 * key when belongs(value) is true; otherwise it's left for its own league, or removed when dropShared is set.
 */
export function readLeagueItem(storage, name, leagueID, { belongs = () => false, dropShared = false } = {}) {
    try {
        const own = storage?.getItem(leagueKey(name, leagueID));
        if (own != null) return JSON.parse(own);
        const shared = storage?.getItem(name);
        if (shared == null) return null;
        const value = JSON.parse(shared);
        if (belongs(value)) {
            storage.setItem(leagueKey(name, leagueID), shared);
            storage.removeItem(name);
            return value;
        }
        if (dropShared) storage.removeItem(name);
        return null;
    } catch {
        return null;
    }
}

/** Save `value` for this league. false when storage is full or blocked (the page keeps it for this visit only). */
export function writeLeagueItem(storage, name, leagueID, value) {
    try {
        if (!storage) return false;
        storage.setItem(leagueKey(name, leagueID), JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

/**
 * Sleeper's player data is big (about 2.7M characters), so only one league's copy is kept: it's tagged with its
 * league ("playersLeague") and counts as missing for any other league. Copies saved before the tag are downloaded
 * again once.
 */
export const playersBelongTo = (savedLeagueID, leagueID) => savedLeagueID != null && String(savedLeagueID) === String(leagueID);
