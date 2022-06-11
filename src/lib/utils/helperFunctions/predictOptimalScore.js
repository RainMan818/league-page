export const predictScores = (players, week, leagueData, name) => {
  const starterPositions = getStarterPositions(leagueData);

  // sort roster by highest projected points for that week
  const projectedPlayers = [...players].sort(
    (a, b) =>
      (b.wi && b.wi[week] ? b.wi[week].p : 0) -
      (a.wi && a.wi[week] ? a.wi[week].p : 0)
  );

  // now that the players are sorted, grab the QBs
  const qbs = projectedPlayers.filter((p) => p.pos == "QB");
  // and the WRs
  const wrs = projectedPlayers.filter((p) => p.pos == "WR");
  // and the RBs
  const rbs = projectedPlayers.filter((p) => p.pos == "RB");
  // and the TEs
  const tes = projectedPlayers.filter((p) => p.pos == "TE");
  // and the DLs
  const dls = projectedPlayers.filter(
    (p) => p.pos == "DL" || p.positions.includes("DL")
  );
  // and the LBs
  const lbs = projectedPlayers.filter(
    (p) => p.pos == "LB" && !p.positions.includes("DL")
  );
  // and the DBs
  const dbs = projectedPlayers.filter((p) => p.pos == "DB");

  let powerScore = 0;
  const powerScores = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    DL: 0,
    LB: 0,
    DB: 0,
    FLEX: 0,
    SUPER_FLEX: 0,
    IDP_FLEX: 0,
  };
  // next, use the roster configuration to grab the highest scorer at each position
  for (const starterPosition of starterPositions) {
    const qb = parseFloat(
      qbs[0]?.wi && qbs[0]?.wi[week] ? qbs[0].wi[week].p : 0
    );
    const rb = parseFloat(
      rbs[0]?.wi && rbs[0]?.wi[week] ? rbs[0].wi[week].p : 0
    );
    const wr = parseFloat(
      wrs[0]?.wi && wrs[0]?.wi[week] ? wrs[0].wi[week].p : 0
    );
    const te = parseFloat(
      tes[0]?.wi && tes[0]?.wi[week] ? tes[0].wi[week].p : 0
    );
    const dl = parseFloat(
      dls[0]?.wi && dls[0]?.wi[week] ? dls[0].wi[week].p : 0
    );
    const lb = parseFloat(
      lbs[0]?.wi && lbs[0]?.wi[week] ? lbs[0].wi[week].p : 0
    );
    const db = parseFloat(
      dbs[0]?.wi && dbs[0]?.wi[week] ? dbs[0].wi[week].p : 0
    );
    switch (starterPosition) {
      case "QB":
        qbs.shift();
        powerScore += qb;
        powerScores.QB += qb;
        break;
      case "RB":
        rbs.shift();
        powerScore += rb;
        powerScores.RB += rb;
        break;
      case "WR":
        wrs.shift();
        powerScore += wr;
        powerScores.WR += wr;
        break;
      case "TE":
        tes.shift();
        powerScore += te;
        powerScores.TE += te;
        break;
      case "DL":
        dls.shift();
        powerScore += dl;
        powerScores.DL += dl;
        break;
      case "LB":
        lbs.shift();
        powerScore += lb;
        powerScores.LB += lb;
        break;
      case "DB":
        dbs.shift();
        powerScore += db;
        powerScores.DB += db;
        break;
      // Start of flex players
      case "FLEX":
        if (rb >= wr && rb >= te) {
          rbs.shift();
          powerScore += rb;
          powerScores.FLEX += rb;
        } else if (wr >= rb && wr >= te) {
          wrs.shift();
          powerScore += wr;
          powerScores.FLEX += wr;
        } else {
          tes.shift();
          powerScore += te;
          powerScores.FLEX += te;
        }
        break;
      case "WRRB_FLEX":
        if (rb >= wr) {
          rbs.shift();
          powerScore += rb;
          powerScores.WRRB_FLEX += rb;
        } else {
          wrs.shift();
          powerScore += wr;
          powerScores.WRRB_FLEX += wr;
        }
        break;
      case "SUPER_FLEX":
        if (qb >= wr && qb >= te && qb >= rb) {
          qbs.shift();
          powerScore += qb;
          powerScores.SUPER_FLEX += qb;
        } else if (rb >= wr && rb >= te && rb >= qb) {
          rbs.shift();
          powerScore += rb;
          powerScores.SUPER_FLEX += rb;
        } else if (wr >= rb && wr >= te && wr >= qb) {
          wrs.shift();
          powerScore += wr;
          powerScores.SUPER_FLEX += wr;
        } else {
          tes.shift();
          powerScore += te;
          powerScores.SUPER_FLEX += te;
        }
        break;
      case "IDP_FLEX":
        if (dl >= lb && dl >= db) {
          dls.shift();
          powerScore += dl;
          powerScores.IDP_FLEX += dl;
        } else if (lb >= dl && lb >= db) {
          lbs.shift();
          powerScore += lb;
          powerScores.IDP_FLEX += lb;
        } else {
          dbs.shift();
          powerScore += db;
          powerScores.IDP_FLEX += db;
        }
        break;
      default:
        break;
    }
  }
  // TODO - add "all" scoring across season
  return { powerScore, powerScores };
};

export const getStarterPositions = (leagueData) => {
  const rosterPositions = leagueData.roster_positions;
  const firstBench = rosterPositions.indexOf("BN");

  return rosterPositions.slice(0, firstBench);
};
