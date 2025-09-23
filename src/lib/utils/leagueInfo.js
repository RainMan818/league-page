/*   STEP 1   */
export const leagueID = "1181324955627573248"; // your league ID
export const leagueName = "The Dynasty League IDP SF"; // your league name
export const dues = 50; // (optional) used in template constitution page
export const dynasty = true; // true for dynasty leagues, false for redraft and keeper
export const enableBlog = false; // requires VITE_CONTENTFUL_ACCESS_TOKEN and VITE_CONTENTFUL_SPACE environment variables

/*   STEP 2   */
export const homepageText = `
  <div style="text-align: center;">
  <i>2025 12-Team Dynasty Half-PPR</i>
  </div>
`;

/*   STEP 3   */
/*
3 managers as an example. Uncomment (remove the //) before each line to make it live code
If you're having trouble, reference the Training Wheels' Manager Section
https://github.com/nmelhado/league-page/blob/master/TRAINING_WHEELS.md#ii-adding-managers-and-changing-the-homepage-text
*/

// To omit an optional field, set it's value to null

export const managers = [
  {
    managerID: "388461715769032704", // ID of the roster that the manager manages (look at the order of the power rankings graph)
    name: "Raymond C.",
    //   "tookOver": 2020, // (optional) used if a manager took over a team, delete this line or change to null otherwise
    location: "San Jose, CA", // (optional)
    bio: "Lorem ipsum... ",
    photo: "https://sleepercdn.com/avatars/thumbs/80645f1579d945dba38b2bc0a70fb881", // square ratio recommended (no larger than 500x500)
    fantasyStart: 2014, // (optional) when did the manager start playing fantasy football
    favoriteTeam: "lar", // (optional) favorite NFL team, (follows convention: nyj, sea, mia, etc.) MUST BE LOWERCASE
    //   "mode": "Win Now", // (optional) 'Win Now', 'Dynasty', or 'Rebuild' (anything else and you will need to add a new png to /static/ similar to the 'Rebuild.png' and 'Win Now.png' currently in there)
    rival: {
      name: "TBD", // Can be anything (usually your rival's name)
      link: 6, // manager array number within this array, or null to link back to all managers page
      image: "/managers/question.jpg", // either a specific manager photo or '/managers/everyone.png' or '/managers/question.png'
    },
    "favoritePlayer": 4866, // (optional) this corresponds to the Sleeper player ID (https://api.sleeper.app/v1/players/nfl)
    //   "valuePosition": "WR", // (optional) Favorite position (QB, WR, RB, TE, etc.)
    //   "rookieOrVets": "Rookies", // (optional) 'Rookies' or 'Vets' (anything else and you will need to add a new png to /static/ similar to the 'Rookies.png' and 'Vets.png' currently in there)
    philosophy: "If you ain't first you're last",
    tradingScale: 10, // 1 - 10
    preferredContact: "Sleeper", // 'Text', 'WhatsApp', 'Sleeper', 'Email', 'Phone', 'Discord', and 'Carrier Pigeon' are currently supplied in the template
  },
  {
    managerID: "508408570420830208",
    name: "Ian P.",
    location: "Reno, NV",
    bio: "Lorem ipsum...",
    photo: "https://sleepercdn.com/avatars/thumbs/cbac431dd55d9dcf188f031c7909d852",
    fantasyStart: 2012,
    favoriteTeam: "lv",
    favoritePlayer: 4663, // Austin Ekeler
    philosophy: "Always moving players on and off roster",
    tradingScale: 10,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Sleeper",
  },
  {
    managerID: "467574896226988032",
    name: "Lucien Miller",
    location: "Corvallis, Oregon",
    bio:
      "I play a ton of League of Legends! If anyone wants to climb solo/duo hit me up @LucienNotLucian",
    photo: "https://sleepercdn.com/avatars/thumbs/8b9624bef6a7bf12eae3389bb2de985b",
    fantasyStart: 2013,
    favoriteTeam: "sea",
    favoritePlayer: 639, // Kam Chancellor
    philosophy: "Get your guys and start your studs",
    tradingScale: 4,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Text",
  },
  {
    managerID: "828361223035826176",
    name: "Ryan Hunt",
    location: "San Jose, CA",
    bio: "I enjoy long walks and short piers. ",
    photo: "https://sleepercdn.com/avatars/thumbs/f0edbf4278f53f9425db175073df6584",
    fantasyStart: 2016,
    favoriteTeam: "sf",
    favoritePlayer: 4217, // George Kittle
    philosophy: "I just like to Gamble. No need for “research.”",
    tradingScale: 5,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Sleeper",
  },
  {
    managerID: "828361877338812416",
    name: "Derek",
    location: "Bay Area",
    bio: "Lorem ipsum...",
    photo: "https://sleepercdn.com/avatars/thumbs/c53452124ccc6b7aad1f455f9660b242",
    fantasyStart: 2010,
    favoriteTeam: "dal",
    favoritePlayer: 3164, // Ezekiel Elliot
    philosophy: "",
    tradingScale: 7,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Telegram",
  },
  {
    managerID: "828390080979763200",
    name: "Josh H.",
    location: "Kailua, HI",
    bio:
      "I love football, Ian is my cousin, I like to get drunk…did I mention Ian is family?",
    photo: "https://sleepercdn.com/uploads/3bd913b3bfd9b7254a2a3f9dc4f7f910.jpg",
    fantasyStart: 2015,
    favoriteTeam: "lar",
    favoritePlayer: 2227, // Aaron Donald
    philosophy: "Slow is smooth and smooth is fast",
    tradingScale: 5,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Text",
  },
  {
    managerID: "829446264419659776",
    name: "Jeryn S",
    location: "Brooklyn",
    bio: "Sundays are for football, golf and F1",
    photo: "https://sleepercdn.com/avatars/thumbs/42b140461e96371bb47d182188c4ff93",
    fantasyStart: 2003,
    favoriteTeam: "lac",
    favoritePlayer: 1479, // Keenan Allen
    philosophy: "Paralysis by analysis",
    tradingScale: 8,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Sleeper",
  },
  {
    managerID: "829452140501151744",
    name: "Zach Behnke",
    location: "Brooklyn",
    bio: "I want Tight Ends to stop hurting me.",
    photo: "https://sleepercdn.com/uploads/11b3e764d375b2fc62d04a256f667707.jpg",
    fantasyStart: 2006,
    favoriteTeam: "gb",
    favoritePlayer: 4979, // Jaire Alexander
    philosophy: "No way the Packers disappoint me in the playoffs this year!",
    tradingScale: 4,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Sleeper",
  },
  {
    managerID: "467417293870067712",
    name: "Brendan P.",
    location: "Cayucos, CA",
    bio: "Lorem ipsum...",
    photo: "https://sleepercdn.com/avatars/thumbs/e4d90bf3a010debbcbef6993d3a5df1c",
    fantasyStart: 2016,
    favoriteTeam: "lac",
    favoritePlayer: 5709, // Luis Perez
    philosophy: "Bet it all MF",
    tradingScale: 9,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Sleeper",
  },
  {
    managerID: "607453184994123776",
    name: "Sean O'Neill",
    location: "Washington, DC",
    bio: "I don’t watch football. If you lose to me you should feel shame.",
    photo: "https://sleepercdn.com/avatars/thumbs/d74cfa986aca87ce83d07d975b83fb7d",
    fantasyStart: 2014,
    favoriteTeam: "sf",
    favoritePlayer: 2374, // Tyler Lockett, babyyyyy
    philosophy: "I will never lose again - Shoresy",
    tradingScale: 3,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Sending",
  },
  {
    managerID: "829864649708126208",
    name: "Cal Arseneau",
    location: "Brooklyn",
    bio: "My my second and third toes are longer than my big toe on both feet",
    photo: "https://sleepercdn.com/avatars/thumbs/8a8ae21a155784866b0ffde004c35b18",
    fantasyStart: 1929,
    favoriteTeam: "miam", // The marlins
    favoritePlayer: 8371, // Chad Muma
    philosophy: "If you’re not first you’re last",
    tradingScale: 1,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Sleeper",
  },
  {
    managerID: "830025240041086976",
    name: "James",
    location: "Munich Bavaria Germany",
    bio: "Bees can perceive time",
    photo: "https://sleepercdn.com/uploads/6b7309b9d8d7454a826b5a37c5da82fe.jpg",
    fantasyStart: 2014,
    favoriteTeam: "sf",
    favoritePlayer: 3198, // Derrick Henry
    philosophy:
      "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Navy Seals, and I've been involved in numerous secret raids on Al-Quaeda, and I have over 300 confirmed kills. I am trained in gorilla warfare and I'm the top sniper in the entire US armed forces. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Earth, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of spies across the USA and your IP is being traced right now so you better prepare for the storm, maggot. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bare hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the United States Marine Corps and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little 'clever' comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will shit fury all over you and you will drown in it. You're fucking dead, kiddo.",
    tradingScale: 10,
    rival: {
      name: "TBD",
      link: 6,
      image: "/managers/question.jpg",
    },
    preferredContact: "Sleeper",
  },
  ]
  
  
  /*   !!  !!  IMPORTANT  !!  !! */
  /*
  Below is the most up to-date version of a manager. Please leave this commented out
  and don't delete it. This will be updated if any fields are added, removed or changed
  and will allow updates without causing merge conflicts
  */
  
    // {
    //   "roster": 3,  // (DEPRECATED! Don't use this anymore) ID of the roster that the manager manages (look at the order of the power rankings graph)
    //   "managerID":" "12345678"",  // the user's manager ID, go to https://api.sleeper.app/v1/league/<your_league_id>/users to find user IDs (you can use older leagueIDs to find user IDs for managers that are no longer in the league)
    //   "name": "Your Name",
    //   "tookOver": 2020, // (DEPRECATED! You don't need to use this anymore) (optional) used if a manager took over a team, delete this line or change to null otherwise
    //   "location": "Brooklyn", // (optional)
    //   "bio": "Lorem ipsum...",
    //   "photo": "/managers/name.jpg", // square ratio recommended (no larger than 500x500)
    //   "fantasyStart": 2014, // (optional) when did the manager start playing fantasy football
    //   "favoriteTeam": "nyj", // (optional) favorite NFL team, (follows convention: nyj, sea, mia, etc.) MUST BE LOWERCASE
    //   "mode": "Win Now", // (optional) 'Win Now', 'Dynasty', or 'Rebuild' (anything else and you will need to add a new png to /static/ similar to the 'Rebuild.png' and 'Win Now.png' currently in there)
    //   "rival": {
    //     name: "Rival", // Can be anything (usually your rival's name)
    //     link: 6, // manager array number within this array, or null to link back to all managers page
    //     image: "/managers/rival.jpg", // either a specific manager photo or '/managers/everyone.png' or '/managers/question.png'
    //   },
    //   "favoritePlayer": 1426, // (optional) this corresponds to the Sleeper player ID (https://api.sleeper.app/v1/players/nfl)
    //   "valuePosition": "WR", // (optional) Favorite position (QB, WR, RB, TE, etc.)
    //   "rookieOrVets": "Rookies", // (optional) 'Rookies' or 'Vets' (anything else and you will need to add a new png to /static/ similar to the 'Rookies.png' and 'Vets.png' currently in there)
    //   "philosophy": "Your fantasy team's philosophy", // (optional)
    //   "tradingScale": 10, // 1 - 10 (optional)
    //   "preferredContact": "Text",  // (optional) 'Text', 'WhatsApp', 'Sleeper', 'Email', 'Phone', 'Discord', and 'Carrier Pigeon' are currently supplied in the template
    // },
    
