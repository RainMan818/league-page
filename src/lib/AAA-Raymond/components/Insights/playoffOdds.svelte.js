// Whether the homepage shows the playoff odds (read by PlayoffProjection and TeamBreakdown). Starts at the site default
// (config.js SHOW_PLAYOFF_ODDS); OddsSwitch.svelte (mounted in src/routes/+layout.svelte) applies the saved choice
// and the secret ?odds=on / ?odds=off parameter in the browser (utils/oddsSwitch.js).
import { SHOW_PLAYOFF_ODDS } from './config.js';

export const playoffOdds = $state({ show: SHOW_PLAYOFF_ODDS });
