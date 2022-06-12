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
//   const colors = ["#57bb8a", "#ffd666", "#e67c73"];
  const colorsGYR = ["#0b8148", "#fccf55", "#f75c4d"];
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
  const ages = numArray.filter(Boolean);
  const total = ages.filter(Boolean).reduce((total, num) => {
    total += num;
    return total;
  }, 0);
  const average = total / ages.length;
  if (isNaN(average)) {
    return 0;
  }
  return average;
}

export function digestData(passedPlayers, rawPlayers) {
  let ageLists = {
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

    const positions = passedPlayers[singlePlayer].positions;
    const age = passedPlayers[singlePlayer].age || 22;

    ageLists.Team.push(age);
    if (positions.length === 2) {
      if (positions.includes("DL")) {
        ageLists.DL.push(age);
        ageLists.Def.push(age);
        continue;
      } else if (positions.includes("DB")) {
        ageLists.DB.push(age);
        ageLists.Def.push(age);
        continue;
      }
    }
    if (positions.includes("QB")) {
      ageLists.QB.push(age);
      ageLists.Off.push(age);
      continue;
    }
    if (positions.includes("RB")) {
      ageLists.RB.push(age);
      ageLists.Off.push(age);
      continue;
    }
    if (positions.includes("WR")) {
      ageLists.WR.push(age);
      ageLists.Off.push(age);
      continue;
    }
    if (positions.includes("TE")) {
      ageLists.TE.push(age);
      ageLists.Off.push(age);
      continue;
    }
    if (positions.includes("DL")) {
      ageLists.DL.push(age);
      ageLists.Off.push(age);
      continue;
    }
    if (positions.includes("LB")) {
      ageLists.LB.push(age);
      ageLists.Def.push(age);
      continue;
    }
    if (positions.includes("DB")) {
      ageLists.DB.push(age);
      ageLists.Def.push(age);
      continue;
    }

    ageLists.push(player);
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
  // Set "max"
//   max.Team = Math.max(max.Team, ageTeam);
//   max.Off = Math.max(max.Off, ageOff);
//   max.Def = Math.max(max.Def, ageDef);
//   max.QB = Math.max(max.QB, ageQB);
//   max.RB = Math.max(max.RB, ageRB);
//   max.WR = Math.max(max.WR, ageWR);
//   max.TE = Math.max(max.TE, ageTE);
//   max.DL = Math.max(max.DL, ageDL);
//   max.LB = Math.max(max.LB, ageLB);
//   max.DB = Math.max(max.DB, ageDB);
//   // Set "min"
//   min.Team = Math.min(min.Team, ageTeam);
//   min.Off = Math.min(min.Off, ageOff);
//   min.Def = Math.min(min.Def, ageDef);
//   min.QB = Math.min(min.QB, ageQB);
//   min.RB = Math.min(min.RB, ageRB);
//   min.WR = Math.min(min.WR, ageWR);
//   min.TE = Math.min(min.TE, ageTE);
//   min.DL = Math.min(min.DL, ageDL);
//   min.LB = Math.min(min.LB, ageLB);
//   min.DB = Math.min(min.DB, ageDB);

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
  };
}
