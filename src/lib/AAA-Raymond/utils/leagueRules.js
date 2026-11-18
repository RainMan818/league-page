// The Dynasty League's own rules ("house rules", Nov 16) that the plain math modules follow: the points-wildcard
// playoff seed (playoffs.js) and the rookie draft order (draftOrder.js: non-playoff teams by lowest max PF, then
// 5th, 6th, 3rd, 4th, runner-up, champion). Other leagues get plain rules: division winners then best records, and
// the draft in reverse order of finish. leagueInfo.js sets this from the league's profile (houseRules) when it loads;
// on by default, so the tests and The Dynasty League are unchanged. Pages check `houseRules` from leagueInfo.js
// directly (Constitution, Payouts tab, Toilet Bowl pick).
export const LEAGUE_RULES = { houseRules: true };

export const setHouseRules = (on) => {
    LEAGUE_RULES.houseRules = on !== false;
};

export const houseRulesOn = () => LEAGUE_RULES.houseRules;
