// Run with: npm test
// Fixtures are real Sleeper answers (player stats endpoint, Nov 15 2026) and the league's scoring settings; the
// expected points are the ones the league's matchups show for those weeks.
import assert from 'assert/strict';
import { test } from 'node:test';
import {
    cardGroup, scoreStats, scoreBreakdown, statLabel, statGroups, statCells, snapShare, sumStats, lastFantasyWeek,
    weekCards, defaultWeek, opponentLabel, gameLog, seasonSoFar, upcomingProjection, statTiles, leaguePoints,
    positionRank, rosterSpot, pickInRound, draftHistory, transactionHistory, leagueHistory, careerSeasons, careerRows,
    trimStats, played,
} from '../src/lib/AAA-Raymond/utils/playerCard.js';

// the league's scoring (non-zero values only)
const SCORING = {
    bonus_rec_te: 1, bonus_rec_wr: 0.5, pass_int: -2, pass_2pt: 2, st_td: 6, rec_td: 6, idp_blk_kick: 6, idp_fum_ret_yd: 0.04,
    rush_td: 6, rec_2pt: 2, idp_tkl_loss: 3, idp_tkl_solo: 1, st_fum_rec: 2, idp_int: 6, rec: 0.5, idp_int_ret_yd: 0.04,
    idp_safe: 10, idp_def_td: 6, idp_pass_def_3p: 3, fum_lost: -2, kr_yd: 0.04, rush_att: 0.1, st_tkl_solo: 1, idp_sack: 4,
    rush_2pt: 2, idp_pass_def: 3, idp_fum_rec: 2, pass_yd: 0.04, pass_td: 4, idp_qb_hit: 1, rush_yd: 0.1, pr_yd: 0.04,
    fum_rec_td: 6, rec_yd: 0.1, idp_ff: 4, st_ff: 4, idp_tkl_ast: 0.5,
};

// Blake Cashman (LB, MIN): week 6 bye, week 7 vs IND (42.0 in the matchups), week 9 vs BUF (18.0), week 10 not played
const CASHMAN = {
    6: null,
    7: { week: 7, opponent: 'IND', is_away_team: false, stats: { bonus_sack_2p: 1, bonus_tkl_10p: 1, def_snp: 58, gms_active: 1, gp: 1, gs: 1, idp_pass_def: 4, idp_pass_def_3p: 1, idp_qb_hit: 3, idp_sack: 2, idp_sack_yd: 24, idp_tkl: 12, idp_tkl_ast: 4, idp_tkl_loss: 2, idp_tkl_solo: 8, pos_rank_half_ppr: 999, pts_idp: 51, tm_def_snp: 58, tm_off_snp: 59, tm_st_snp: 23 } },
    8: { week: 8, opponent: 'DET', is_away_team: true, stats: { def_snp: 71, gp: 1, idp_tkl: 10, idp_tkl_ast: 5, idp_tkl_loss: 1, idp_tkl_solo: 5, tm_def_snp: 72 } },
    9: { week: 9, opponent: 'BUF', is_away_team: false, stats: { bonus_tkl_10p: 1, def_snp: 69, gms_active: 1, gp: 1, gs: 1, idp_pass_def: 2, idp_tkl: 12, idp_tkl_ast: 6, idp_tkl_loss: 1, idp_tkl_solo: 6, pos_rank_half_ppr: 999, pts_idp: 26, tm_def_snp: 80, tm_off_snp: 48, tm_st_snp: 26 } },
    10: null,
};
const CASHMAN_WI = {
    5: { p: '7.53', o: 'NO' }, 6: { p: '0.00', o: null }, 7: { p: '7.80', o: 'IND' }, 8: { p: '7.37', o: 'DET' }, 9: { p: '7.96', o: 'BUF' },
    10: { p: '0.00', o: 'GB' }, 11: { p: '7.96', o: 'SF' }, 12: { p: '8.25', o: 'ATL' }, 13: { p: '8.25', o: 'CAR' }, 14: { p: '8.25', o: 'NE' },
};
// Will Anderson Jr. (DL, HOU): week 10 @ CLE, game over but the week still live (16.0)
const ANDERSON_10 = { week: 10, opponent: 'CLE', is_away_team: true, stats: { gms_active: 1, gp: 1, gs: 1, idp_ff: 1, idp_qb_hit: 2, idp_sack: 1, idp_sack_yd: 9, idp_tkl: 4, idp_tkl_ast: 2, idp_tkl_loss: 1, idp_tkl_solo: 2, penalty: 1, penalty_yd: 5, pts_idp: 19 } };
// Kyle Hamilton (DB, BAL): week 4 vs TEN (16.5)
const HAMILTON_4 = { def_snp: 64, gms_active: 1, gp: 1, gs: 1, idp_ff: 1, idp_pass_def: 1, idp_tkl: 7, idp_tkl_ast: 1, idp_tkl_loss: 1, idp_tkl_solo: 6, penalty: 2, penalty_yd: 26, pts_idp: 21, st_snp: 1, tm_def_snp: 64 };
// Christian McCaffrey (RB, SF): 2025 season totals (a few of Sleeper's ~80 keys; he made 3 solo + 1 assisted tackle)
const CMC_2025 = { gp: 17, rush_att: 311, rush_yd: 1202, rush_td: 10, rec: 102, rec_tgt: 129, rec_yd: 924, rec_td: 7, fum: 2, idp_tkl_solo: 3, idp_tkl_ast: 1, off_snp: 932, tm_off_snp: 1123, pts_half_ppr: 365.6, rank_ppr: 1, bonus_rec_rb: 102, pass_att: 1, pass_inc: 1 };
// Amon-Ra St. Brown (WR, DET): week 1 vs NO, 10 catches on 14 targets, 67 yards, 2 TDs (28.7)
const ARSB_1 = { gp: 1, rec: 10, rec_tgt: 14, rec_yd: 67, rec_td: 2, bonus_rec_wr: 10, off_snp: 69, tm_off_snp: 77 };

test('card groups come from the listed position first (Anderson is DL with LB eligibility)', () => {
    assert.equal(cardGroup({ pos: 'DL', positions: ['DL', 'LB'] }), 'DL');
    assert.equal(cardGroup({ pos: 'CB' }), 'DB');
    assert.equal(cardGroup({ pos: 'K' }), null);
});

test('league points: every stat x scoring reproduces the matchup points', () => {
    assert.equal(scoreStats(CASHMAN[7].stats, SCORING), 42);
    assert.equal(scoreStats(CASHMAN[9].stats, SCORING), 18);
    assert.equal(scoreStats(ANDERSON_10.stats, SCORING), 16);
    assert.equal(scoreStats(HAMILTON_4, SCORING), 16.5);
    assert.equal(scoreStats(ARSB_1, SCORING), 28.7);
    assert.equal(scoreStats(CMC_2025, SCORING), 400.2); // his tackles count too
    assert.equal(scoreStats(null, SCORING), 0);
});

test('breakdown: the stats that scored, biggest first, with labels', () => {
    const rows = scoreBreakdown(CASHMAN[7].stats, SCORING);
    assert.deepEqual(rows.map((r) => `${r.label}:${r.value}x${r.mult}=${r.points}`), [
        'Passes defended:4x3=12', 'Sacks:2x4=8', 'Solo tackles:8x1=8', 'Tackles for loss:2x3=6',
        '3+ passes defended bonus:1x3=3', 'QB hits:3x1=3', 'Assisted tackles:4x0.5=2',
    ]);
    assert.equal(rows.reduce((s, r) => s + r.points, 0), 42);
    assert.equal(statLabel('idp_blk_kick'), 'Blocked kicks');
    assert.equal(statLabel('weird_new_stat'), 'Weird new stat');
});

test('stat groups: same columns per side of the ball, main group first', () => {
    const labels = (g) => statGroups(g).map((x) => `${x.label}(${x.cols.map((c) => c.label).join(' ')})`).join(' ');
    assert.equal(labels('WR'), 'RECEIVING(REC YDS TD) RUSHING(ATT YDS TD)');
    assert.equal(labels('TE'), labels('WR'));
    assert.equal(labels('RB'), 'RUSHING(ATT YDS TD) RECEIVING(REC YDS TD)');
    assert.equal(labels('QB'), 'PASSING(CMP YDS TD INT) RUSHING(ATT YDS TD)');
    assert.equal(labels('LB'), 'TACKLES(TKL SOLO TFL) RUSH(SCK HIT) COVER(PD INT) FUM(FF FR)');
    assert.equal(labels('DL'), labels('LB'));
    assert.equal(labels('DB'), 'TACKLES(TKL SOLO TFL) COVER(PD INT) RUSH(SCK HIT) FUM(FF FR)');
    assert.deepEqual(statGroups('K'), []);
});

test('stat cells: text per column, zeros flagged (they show dimmed)', () => {
    const wr = statCells(ARSB_1, 'WR');
    assert.deepEqual(wr.map((g) => g.map((c) => (c.zero ? `(${c.text})` : c.text))), [['10/14', '67', '2'], ['(0)', '(0)', '(0)']]);
    const lb = statCells(CASHMAN[7].stats, 'LB');
    assert.deepEqual(lb.map((g) => g.map((c) => (c.zero ? `(${c.text})` : c.text))), [['12', '8', '2'], ['2', '3'], ['4', '(0)'], ['(0)', '(0)']]);
    const rb = statCells(CMC_2025, 'RB');
    assert.deepEqual(rb[0].map((c) => c.text), ['311', '1,202', '10']);
    // half sacks stay halves; tackles fall back to solo + assisted
    assert.equal(statCells({ idp_sack: 0.5, idp_tkl_solo: 1, idp_tkl_ast: 2 }, 'DL')[1][0].text, '0.5');
    assert.equal(statCells({ idp_tkl_solo: 1, idp_tkl_ast: 2 }, 'DL')[0][0].text, '3');
});

test('snap share uses the player\'s side of the ball', () => {
    assert.equal(snapShare(ARSB_1, 'WR'), 90);
    assert.equal(snapShare(CASHMAN[9].stats, 'LB'), 86);
    assert.equal(snapShare(ANDERSON_10.stats, 'DL'), null); // no snap counts yet
});

test('fantasy weeks: regular season plus the playoff rounds', () => {
    assert.equal(lastFantasyWeek({ playoff_week_start: 15, playoff_teams: 6 }), 17);
    assert.equal(lastFantasyWeek({ playoff_week_start: 15, playoff_teams: 4 }), 16);
    assert.equal(lastFantasyWeek({ playoff_week_start: 18, playoff_teams: 8 }), 18);
});

test('week cards: played, bye, missed, live and projected weeks', () => {
    const cards = weekCards({ weekly: CASHMAN, projections: CASHMAN_WI, scoring: SCORING, lastWeek: 12, currentWeek: 10 });
    const byWeek = Object.fromEntries(cards.map((c) => [c.week, c]));
    assert.equal(cards.length, 12);
    assert.equal(byWeek[5].status, 'out'); // his team played, he has no stats
    assert.equal(byWeek[6].status, 'bye');
    assert.deepEqual(byWeek[7], { week: 7, status: 'played', opp: 'IND', away: false, points: 42, proj: 7.8 });
    assert.equal(byWeek[10].status, 'projected'); // current week, no stats yet
    assert.equal(byWeek[10].proj, 0);
    assert.deepEqual(byWeek[11], { week: 11, status: 'projected', opp: 'SF', away: null, points: null, proj: 7.96 });
    assert.equal(defaultWeek(cards), 9);

    const live = weekCards({ weekly: { 10: ANDERSON_10 }, projections: { 10: { p: '11.03', o: 'CLE' } }, scoring: SCORING, lastWeek: 10, currentWeek: 10 });
    assert.deepEqual(live[9], { week: 10, status: 'live', opp: 'CLE', away: true, points: 16, proj: 11.03 });
    assert.equal(defaultWeek(live), 10);
    // a finished season (no current week): missing weeks are byes or missed games, never projections
    const past = weekCards({ weekly: { 1: { opponent: 'NO', stats: ARSB_1 }, 2: null }, projections: {}, scoring: SCORING, lastWeek: 2 });
    assert.deepEqual(past.map((c) => c.status), ['played', 'bye']);
    assert.equal(defaultWeek([]), null);
});

test('opponent labels', () => {
    assert.equal(opponentLabel('DAL', true), '@ DAL');
    assert.equal(opponentLabel('DAL', false), 'vs DAL');
    assert.equal(opponentLabel('DAL', null), 'DAL');
    assert.equal(opponentLabel(null, true), '');
});

test('game log: newest first, through the last played week, byes and missed games kept', () => {
    const cards = weekCards({ weekly: CASHMAN, projections: CASHMAN_WI, scoring: SCORING, lastWeek: 12, currentWeek: 10 });
    const log = gameLog({ weekly: CASHMAN, cards, scoring: SCORING, group: 'LB' });
    assert.deepEqual(log.map((r) => `${r.week}:${r.status}:${r.points ?? '-'}`), ['9:played:18', '8:played:10.5', '7:played:42', '6:bye:-', '5:out:-', '4:bye:-', '3:bye:-', '2:bye:-', '1:bye:-']);
    assert.equal(log[0].snaps, 86);
    assert.deepEqual(log[2].cells[0].map((c) => c.text), ['12', '8', '2']);
});

test('season so far: games, points, summed stats and snap share', () => {
    const s = seasonSoFar({ weekly: CASHMAN, scoring: SCORING, group: 'LB' });
    assert.equal(s.games, 3);
    assert.equal(s.points, 70.5);
    assert.equal(s.stats.idp_tkl, 34);
    assert.equal(s.snaps, Math.round((100 * (58 + 71 + 69)) / (58 + 72 + 80)));
    assert.equal(seasonSoFar({ weekly: CASHMAN, scoring: SCORING, group: 'LB', throughWeek: 8 }).games, 2);
    assert.deepEqual(sumStats([{ a: 1, b: 'x' }, { a: 2.5 }]), { a: 3.5 });
});

test('upcoming projection skips byes', () => {
    assert.deepEqual(upcomingProjection(CASHMAN_WI, 10, 17), { avg: 8.18, from: 11, to: 14 });
    assert.deepEqual(upcomingProjection(CASHMAN_WI, 5, 17, 2), { avg: 7.59, from: 7, to: 8 }); // week 6 bye skipped
    assert.equal(upcomingProjection(CASHMAN_WI, 14, 17), null);
});

test('stat tiles per position, with singular labels', () => {
    const lb = statTiles('LB', { idp_tkl_solo: 41, idp_tkl_ast: 35, idp_tkl_loss: 8, idp_sack: 4.5, idp_pass_def: 1 }, 8, 95);
    assert.deepEqual(lb.map((t) => `${t.value} ${t.label}`), ['76 tackles', '9.5 tackles / game', '8 tackles for loss', '4.5 sacks', '1 pass defended', '95% of snaps']);
    const db = statTiles('DB', { idp_tkl: 60, idp_pass_def: 5, idp_int: 1, idp_tkl_loss: 9 }, 9, null);
    assert.deepEqual(db.map((t) => `${t.value} ${t.label}`), ['60 tackles', '6.7 tackles / game', '5 passes defended', '1 interception', '9 tackles for loss', '— of snaps']);
    const rb = statTiles('RB', CMC_2025, 17, 83);
    assert.deepEqual(rb.map((t) => `${t.value} ${t.label}`), ['311 carries', '1,202 rush yards', '3.9 yds / carry', '102 catches', '924 rec yards', '17 TDs']);
    const wr = statTiles('WR', ARSB_1, 1, 90);
    assert.deepEqual(wr.map((t) => `${t.value} ${t.label}`), ['10 catches', '14 targets', '67 rec yards', '2 TDs', '90% of snaps', '71% catch rate']);
    assert.equal(statTiles('DL', { idp_ff: 1 }, 1)[4].label, 'forced fumble');
    assert.equal(statTiles('QB', { pass_cmp: 20, pass_att: 30 }, 1)[3].value, '67%');
    assert.deepEqual(statTiles('K', {}, 0), []);
});

test('league points and position rank among rostered players', () => {
    const matchupWeeks = [
        { matchups: { 1: [{ playersPoints: { a: 10, b: 5 } }, { playersPoints: { c: 7 } }] } },
        { matchups: { 1: [{ playersPoints: { a: 1.1, b: 20 } }] } },
        { matchups: { 1: [{ playersPoints: { a: 100 } }] } },
    ];
    const pts = leaguePoints(matchupWeeks, 2);
    assert.deepEqual(pts, { a: 11.1, b: 25, c: 7 });
    const group = (id) => ({ a: 'LB', b: 'LB', c: 'DB', d: 'LB' })[id];
    assert.deepEqual(positionRank('a', 'LB', ['a', 'b', 'c'], pts, group), { rank: 2, of: 2 });
    assert.deepEqual(positionRank('b', 'LB', ['a', 'b', 'c'], pts, group), { rank: 1, of: 2 });
    assert.deepEqual(positionRank('d', 'LB', ['a', 'b', 'c'], pts, group), { rank: null, of: 2 }); // free agent
});

test('roster spot: starting, bench, taxi, IR or free agent', () => {
    const rosters = { 1: { roster_id: 1, players: ['1', '2', '3', '4'], starters: ['1'], taxi: ['3'], reserve: ['4'] } };
    assert.deepEqual(rosterSpot('1', rosters), { rosterID: 1, status: 'starting' });
    assert.equal(rosterSpot(2, rosters).status, 'bench');
    assert.equal(rosterSpot('3', rosters).status, 'taxi');
    assert.equal(rosterSpot('4', Object.values(rosters)).status, 'ir');
    assert.equal(rosterSpot('9', rosters), null);
});

test('pick numbers match the draft board (snake, third-round reversal, linear)', () => {
    assert.equal(pickInRound(1, 9, 12), 9);
    assert.equal(pickInRound(2, 9, 12), 4);
    assert.equal(pickInRound(3, 9, 12, { reversalRound: 3 }), 4);
    assert.equal(pickInRound(4, 9, 12, { reversalRound: 3 }), 9);
    assert.equal(pickInRound(2, 9, 12, { type: 'linear' }), 9);
});

test('league history: draft picks, trades and waiver moves, oldest first', () => {
    // 2022 startup draft: McCaffrey in round 2, column 9 (roster 8) = 2.04, 16th overall
    const order = [3, 5, 1, 2, 4, 6, 7, 9, 8, 10, 11, 12];
    const draft = { year: 2022, draftType: 'snake', reversalRound: 0, draftOrder: order, draft: [Array(12).fill(null), Array(12).fill(null)] };
    draft.draft[1][8] = { player: '4034' };
    const rookie = { year: 2023, draftType: 'linear', draftOrder: order, draft: [[{ player: 'x', newOwner: 5 }]] };
    const picks = draftHistory('4034', [rookie, draft]);
    assert.deepEqual(picks, [{ kind: 'draft', season: 2022, round: 2, pick: 4, overall: 16, label: '2.04', rosterID: 8 }]);
    assert.equal(draftHistory('x', [rookie])[0].rosterID, 5); // a traded pick: the team that made it

    // Sep 23 2025: three-team trade (rosters 1, 8, 11), then a later waiver drop and pickup
    const trade = {
        id: 't1', type: 'trade', date: 'Sep 23 2025, 9:5PM', season: 2025, ts: 2, rosters: [1, 8, 11],
        moves: [
            [{ type: 'trade', player: '4034' }, 'origin', null],
            [null, 'origin', { type: 'trade', player: 'marks' }],
            [null, { type: 'trade', player: 'golden' }, 'origin'],
            ['origin', null, { type: 'trade', pick: { season: '2026', round: 1, original_owner: null } }],
        ],
    };
    const drop = { id: 'w1', type: 'waiver', date: 'Nov 1 2026, 1:0AM', season: 2026, ts: 4, rosters: [1], moves: [[{ type: 'Dropped', player: '4034' }]] };
    const add = { id: 'w2', type: 'waiver', date: 'Nov 4 2026, 1:0AM', season: 2026, ts: 5, rosters: [6], moves: [[{ type: 'Added', player: '4034', bid: 40 }], [{ type: 'Dropped', player: 'other' }]] };
    const unrelated = { id: 'w3', type: 'waiver', date: 'Nov 4 2026, 1:0AM', season: 2026, ts: 5, rosters: [2], moves: [[{ type: 'Added', player: 'zzz' }]] };
    const moves = transactionHistory('4034', [add, unrelated, drop, trade]); // newest first, like the saved list
    assert.deepEqual(moves.map((m) => `${m.kind}:${m.rosterID}:${m.bid ?? ''}`), ['trade:1:', 'drop:1:', 'add:6:40']);
    assert.equal(moves[0].transaction, trade);

    const all = leagueHistory(picks, moves);
    assert.deepEqual(all.map((e) => `${e.season}:${e.kind}`), ['2022:draft', '2025:trade', '2026:drop', '2026:add']);
});

test('career: league seasons since the rookie year, rows from season totals', () => {
    assert.deepEqual(careerSeasons([2022, 2023, 2024, 2025, 2026], 2026, 9), [2022, 2023, 2024, 2025, 2026]);
    assert.deepEqual(careerSeasons([2022, 2023, 2024, 2025, 2026], 2026, 1), [2025, 2026]);
    assert.deepEqual(careerSeasons([2022, 2026], 2026, 0), [2026]);
    const rows = careerRows({ 2025: CMC_2025, 2024: { gp: 0 }, 2023: null }, SCORING, 'RB');
    assert.equal(rows.length, 1);
    assert.deepEqual({ ...rows[0], cells: undefined }, { season: 2025, games: 17, points: 400.2, perGame: 23.54, cells: undefined });
    assert.deepEqual(rows[0].cells[1].map((c) => c.text), ['102/129', '924', '7']);
});

test('trimming Sleeper\'s answer keeps scored and shown stats only', () => {
    const t = trimStats(CMC_2025, SCORING);
    assert.deepEqual(Object.keys(t).sort(), ['gp', 'idp_tkl_ast', 'idp_tkl_solo', 'off_snp', 'pass_att', 'rec', 'rec_td', 'rec_tgt', 'rec_yd', 'rush_att', 'rush_td', 'rush_yd', 'tm_off_snp']);
    assert.equal(scoreStats(t, SCORING), 400.2);
});

test('played: games played > 0, or any stat without a gp count', () => {
    assert.equal(played({ stats: { gp: 1 } }), true);
    assert.equal(played({ stats: { gp: 0, tm_off_snp: 60 } }), false);
    assert.equal(played({ stats: { rec: 1 } }), true);
    assert.equal(played(null), false);
});
