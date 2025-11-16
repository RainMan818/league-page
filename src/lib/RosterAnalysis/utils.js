import ColorScale from "color-scales";

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
  const colorsGYR = ["#57bb8a", "#ffd666", "#e67c73"];
  //   const colorsGYR = ["#0b8148", "#fccf55", "#f75c4d"]; // brighter
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
  const total = numArray.reduce((total, num) => {
    total += num;
    return total;
  }, 0);
  const average = total / numArray.length;
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
    let player = {};

    if (singlePlayer == "0") {
      continue;
    }

    let coefficientOfVariation;
    if (playerScores[singlePlayer]) {
      const singePlayerScores = playerScores[singlePlayer]
      const stdDeviation = standardDeviation(singePlayerScores);
      const averagePoints = Math.max(getAverage(singePlayerScores), 0);
      coefficientOfVariation = stdDeviation / averagePoints;
    } else {
      console.error("singlePlayer err", singlePlayer)
    }
    const positions = passedPlayers[singlePlayer]?.positions || passedPlayers[singlePlayer]?.pos;
    const age = passedPlayers[singlePlayer].age;

    ageLists.Team.push(age);
    if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.Team.push(coefficientOfVariation);
    if (positions?.length === 2) {
      if (positions.includes("DL")) {
        ageLists.DL.push(age);
        if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.DL.push(coefficientOfVariation);
        ageLists.Def.push(age);
        if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.Def.push(coefficientOfVariation);
        continue;
      } else if (positions.includes("DB")) {
        ageLists.DB.push(age);
        if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.DB.push(coefficientOfVariation);
        ageLists.Def.push(age);
        if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.Def.push(coefficientOfVariation);
        continue;
      }
    }
    if (positions.includes("QB")) {
      ageLists.QB.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.QB.push(coefficientOfVariation);
      ageLists.Off.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.Off.push(coefficientOfVariation);
      continue;
    }
    if (positions.includes("RB")) {
      ageLists.RB.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.RB.push(coefficientOfVariation);
      ageLists.Off.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.Off.push(coefficientOfVariation);
      continue;
    }
    if (positions.includes("WR")) {
      ageLists.WR.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.WR.push(coefficientOfVariation);
      ageLists.Off.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.Off.push(coefficientOfVariation);
      continue;
    }
    if (positions.includes("TE")) {
      ageLists.TE.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.TE.push(coefficientOfVariation);
      ageLists.Off.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.Off.push(coefficientOfVariation);
      continue;
    }
    if (positions.includes("DL")) {
      ageLists.DL.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.DL.push(coefficientOfVariation);
      ageLists.Off.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.Off.push(coefficientOfVariation);
      continue;
    }
    if (positions.includes("LB")) {
      ageLists.LB.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.LB.push(coefficientOfVariation);
      ageLists.Def.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.Def.push(coefficientOfVariation);
      continue;
    }
    if (positions.includes("DB")) {
      ageLists.DB.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.DB.push(coefficientOfVariation);
      ageLists.Def.push(age);
      if (isFinite(coefficientOfVariation) && !isNaN(coefficientOfVariation)) cvData.Def.push(coefficientOfVariation);
      continue;
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