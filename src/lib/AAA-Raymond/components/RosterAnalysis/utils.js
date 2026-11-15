import ColorScale from "color-scales";
import { colorsGYR } from "../../utils/colorScale.js";
import { rosterGroup, OFFENSE_GROUPS } from "../../utils/rosterBreakdown.js";

export function getAgeData(managerData, rosters) {
  return {
    labels: rosters.map(({ ownerName }) => ownerName),
    datasets: [
      {
        name: "QB",
        values: managerData.map(
          (manager) => Math.round(manager.averages.QB * 100) / 100
        ),
      },
      {
        name: "RB",
        values: managerData.map(
          (manager) => Math.round(manager.averages.RB * 100) / 100
        ),
      },
      {
        name: "WR",
        values: managerData.map(
          (manager) => Math.round(manager.averages.WR * 100) / 100
        ),
      },
      {
        name: "TE",
        values: managerData.map(
          (manager) => Math.round(manager.averages.TE * 100) / 100
        ),
      },
      {
        name: "DL",
        values: managerData.map(
          (manager) => Math.round(manager.averages.DL * 100) / 100
        ),
      },
      {
        name: "LB",
        values: managerData.map(
          (manager) => Math.round(manager.averages.LB * 100) / 100
        ),
      },
      {
        name: "DB",
        values: managerData.map(
          (manager) => Math.round(manager.averages.DB * 100) / 100
        ),
      },
    ],
  };
}

export function getCountData(managerData, rosters) {
  return {
    labels: rosters.map(({ ownerName }) => ownerName),
    datasets: [
      {
        name: "QB",
        values: managerData.map((manager) => manager.ageLists.QB.length),
      },
      {
        name: "RB",
        values: managerData.map((manager) => manager.ageLists.RB.length),
      },
      {
        name: "WR",
        values: managerData.map((manager) => manager.ageLists.WR.length),
      },
      {
        name: "TE",
        values: managerData.map((manager) => manager.ageLists.TE.length),
      },
      {
        name: "DL",
        values: managerData.map((manager) => manager.ageLists.DL.length),
      },
      {
        name: "LB",
        values: managerData.map((manager) => manager.ageLists.LB.length),
      },
      {
        name: "DB",
        values: managerData.map((manager) => manager.ageLists.DB.length),
      },
    ],
  };
}

export function getColorScales(min, max) {
  return {
    colorsTeam: new ColorScale(min.Team, max.Team, colorsGYR),
    colorsOff: new ColorScale(min.Off, max.Off, colorsGYR),
    colorsDef: new ColorScale(min.Def, max.Def, colorsGYR),
    colorsQB: new ColorScale(min.QB, max.QB, colorsGYR),
    colorsRB: new ColorScale(min.RB, max.RB, colorsGYR),
    colorsWR: new ColorScale(min.WR, max.WR, colorsGYR),
    colorsTE: new ColorScale(min.TE, max.TE, colorsGYR),
    colorsDL: new ColorScale(min.DL, max.DL, colorsGYR),
    colorsLB: new ColorScale(min.LB, max.LB, colorsGYR),
    colorsDB: new ColorScale(min.DB, max.DB, colorsGYR),
  };
}

function getAverage(numArray) {
  // players without a known age still count as players, but not toward the average
  const known = numArray.filter((n) => n != null && isFinite(n));
  const total = known.reduce((total, num) => {
    total += num;
    return total;
  }, 0);
  const average = total / known.length;
  if (isNaN(average)) {
    return 0;
  }
  return average;
}

function standardDeviation(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squaredDiffs = arr.map(x => (x - mean) ** 2);
  const avgSquareDiff = squaredDiffs.reduce((a, b) => a + b, 0) / arr.length;
  const val = Math.sqrt(avgSquareDiff)
  return val;
}

export function digestData(passedPlayers, rawPlayers, playerScores) {
  const ageLists = {
    Team: [],
    Off: [],
    Def: [],
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    DL: [],
    LB: [],
    DB: [],
  };
  const cvData = {
    Team: [],
    Off: [],
    Def: [],
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    DL: [],
    LB: [],
    DB: [],
  };

  if (!rawPlayers) return ageLists;

  for (const singlePlayer of rawPlayers) {
    if (singlePlayer == "0") continue;
    const player = passedPlayers[singlePlayer];
    // one grouping rule for the site (utils/positions.js): listed position first, so a DE counts as DL
    // and DL players count on defense (they used to be added to offense)
    const group = rosterGroup(player);
    if (!group) continue;

    let coefficientOfVariation;
    if (playerScores[singlePlayer]) {
      const singePlayerScores = playerScores[singlePlayer]
      const stdDeviation = standardDeviation(singePlayerScores);
      const averagePoints = Math.max(getAverage(singePlayerScores), 0);
      coefficientOfVariation = stdDeviation / averagePoints;
    }
    const validCv = isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation);
    const side = OFFENSE_GROUPS.includes(group) ? "Off" : "Def";
    for (const key of ["Team", side, group]) {
      ageLists[key].push(player.age);
      if (validCv) cvData[key].push(coefficientOfVariation);
    }
  }

  const ageTeam = getAverage(ageLists.Team);
  const ageOff = getAverage(ageLists.Off);
  const ageDef = getAverage(ageLists.Def);
  const ageQB = getAverage(ageLists.QB);
  const ageRB = getAverage(ageLists.RB);
  const ageWR = getAverage(ageLists.WR);
  const ageTE = getAverage(ageLists.TE);
  const ageDL = getAverage(ageLists.DL);
  const ageLB = getAverage(ageLists.LB);
  const ageDB = getAverage(ageLists.DB);

  const averages = {
    Team: ageTeam,
    Off: ageOff,
    Def: ageDef,
    QB: ageQB,
    RB: ageRB,
    WR: ageWR,
    TE: ageTE,
    DL: ageDL,
    LB: ageLB,
    DB: ageDB,
  };

  return {
    averages,
    ageLists,
    cvAverages: {
      Team: getAverage(cvData.Team),
      Off: getAverage(cvData.Off),
      Def: getAverage(cvData.Def),
      QB: getAverage(cvData.QB),
      RB: getAverage(cvData.RB),
      WR: getAverage(cvData.WR),
      TE: getAverage(cvData.TE),
      DL: getAverage(cvData.DL),
      LB: getAverage(cvData.LB),
      DB: getAverage(cvData.DB),
    }
  };
}