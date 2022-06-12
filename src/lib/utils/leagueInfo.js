/*   STEP 1   */
export const leagueID = "776558166568747008"; // Dynasty IDP
// export const leagueID = "784390208228544512"; // Gang Attempts Dynasty FF
export const leagueName = "The Dynasty League IDP SF"; // your league name
export const dues = 50; // (optional) used in template constitution page
export const dynasty = true; // true for dynasty leagues, false for redraft and keeper
export const enableBlog = false; // requires VITE_CONTENTFUL_ACCESS_TOKEN and VITE_CONTENTFUL_SPACE environment variables

/*   STEP 2   */
export const homepageText = ``;

/*   STEP 3   */
/*
3 managers as an example. Uncomment (remove the //) before each line to make it live code
If you're having trouble, reference the Training Wheels' Manager Section
https://github.com/nmelhado/league-page/blob/master/TRAINING_WHEELS.md#ii-adding-managers-and-changing-the-homepage-text
*/

// To omit an optional field, set it's value to null

export const managers = [
  {
    roster: 5, // ID of the roster that the manager manages (look at the order of the power rankings graph)
    name: "Raymond C.",
    alias: "RainMan001",
    //   "tookOver": 2020, // (optional) used if a manager took over a team, delete this line or change to null otherwise
    location: "San Jose, CA", // (optional)
    bio: "Lorem ipsum...",
    photo: "/managers/question.jpg", // square ratio recommended (no larger than 500x500)
    fantasyStart: 2014, // (optional) when did the manager start playing fantasy football
    favoriteTeam: "lar", // (optional) favorite NFL team, (follows convention: nyj, sea, mia, etc.) MUST BE LOWERCASE
    //   "mode": "Win Now", // (optional) 'Win Now', 'Dynasty', or 'Rebuild' (anything else and you will need to add a new png to /static/ similar to the 'Rebuild.png' and 'Win Now.png' currently in there)
    rival: {
      name: "Rival name", // Can be anything (usually your rival's name)
      link: 6, // manager array number within this array, or null to link back to all managers page
      image: "/managers/question.jpg", // either a specific manager photo or '/managers/everyone.png' or '/managers/question.png'
    },
    //   "favoritePlayer": 1426, // (optional) this corresponds to the Sleeper player ID (https://api.sleeper.app/v1/players/nfl)
    //   "valuePosition": "WR", // (optional) Favorite position (QB, WR, RB, TE, etc.)
    //   "rookieOrVets": "Rookies", // (optional) 'Rookies' or 'Vets' (anything else and you will need to add a new png to /static/ similar to the 'Rookies.png' and 'Vets.png' currently in there)
    philosophy: "Your fantasy team's philosophy",
    tradingScale: 10, // 1 - 10
    preferredContact: "Sleeper", // 'Text', 'WhatsApp', 'Sleeper', 'Email', 'Phone', 'Discord', and 'Carrier Pigeon' are currently supplied in the template
  },
  {
    roster: 1,
    name: "Ian P.",
    alias: "ianpeterson",
    location: "Reno, NV",
    bio: "Lorem ipsum...",
    photo: "/managers/question.jpg",
    fantasyStart: 2012,
    favoriteTeam: "lv",
    favoritePlayer: 1426, // Austin Ekeler
    philosophy: "Always moving players on and off roster",
    tradingScale: 10,
    preferredContact: "Sleeper",
  },
  {
    roster: 2,
    name: "Lucien Miller",
    alias: "Lmiller",
    location: "Corvallis, Oregon",
    bio:
      "I play a ton of League of Legends! If anyone wants to climb solo/duo hit me up @LucienNotLucian",
    photo: "/managers/question.jpg",
    fantasyStart: 2013,
    favoriteTeam: "sea",
    favoritePlayer: 1426, // Kam Chancellor
    philosophy: "Get your guys and start your studs",
    tradingScale: 4,
    preferredContact: "Text",
  },
  {
    roster: 3,
    name: "Ryan Hunt",
    alias: "Roensb",
    location: "San Jose, CA",
    bio: "I enjoy long walks and short piers. ",
    photo: "/managers/question.jpg",
    fantasyStart: 2016,
    favoriteTeam: "sf",
    favoritePlayer: 1426, // George Kittle
    philosophy: "I just like to Gamble. No need for “research.”",
    tradingScale: 5,
    preferredContact: "Sleeper",
  },
  {
    roster: 4,
    name: "Derek",
    alias: "dlokk",
    location: "Bay Area",
    bio: "Lorem ipsum...",
    photo: "/managers/question.jpg",
    fantasyStart: 2010,
    favoriteTeam: "dal",
    favoritePlayer: 1426, // Ezekiel Elliot
    philosophy: "",
    tradingScale: 7,
    preferredContact: "Telegram",
  },
  {
    roster: 6,
    name: "Josh H.",
    alias: "joshhancock92 aka 2 girls 1 kupp",
    location: "Kailua, HI",
    bio:
      "I love football, Ian is my cousin, I like to get drunk…did I mention Ian is family?",
    photo: "/managers/question.jpg",
    fantasyStart: 2015,
    favoriteTeam: "lar",
    favoritePlayer: 1426, // Aaron Donald
    philosophy: "Slow is smooth and smooth is fast",
    tradingScale: 5,
    preferredContact: "Text",
  },
  {
    roster: 7,
    name: "Jeryn S",
    alias: "jsamp",
    location: "Brooklyn",
    bio: "Sundays are for football, golf and F1",
    photo: "/managers/question.jpg",
    fantasyStart: 2003,
    favoriteTeam: "lac",
    favoritePlayer: 1426, // Keenan Allen
    philosophy: "Paralysis by analysis",
    tradingScale: 8,
    preferredContact: "Sleeper",
  },
  {
    roster: 8,
    name: "Zach Behnke",
    name: "Gloot_Sloot",
    location: "Brooklyn",
    bio: "I want Tight Ends to stop hurting me.",
    photo: "/managers/question.jpg",
    fantasyStart: 2006,
    favoriteTeam: "gb",
    favoritePlayer: 1426, // Jaire Alexander
    philosophy: "No way the Packers disappoint me in the playoffs this year!",
    tradingScale: 4,
    preferredContact: "Sleeper",
  },
  {
    roster: 9,
    name: "Brendan P.",
    alias: "Brenlen",
    location: "Cayucos, CA",
    bio: "Lorem ipsum...",
    photo: "/managers/question.jpg",
    fantasyStart: 2016,
    favoriteTeam: "nyj",
    favoritePlayer: 1426, // Luis Perez
    philosophy: "Bet it all MF",
    tradingScale: 9,
    preferredContact: "Sleeper",
  },
  {
    roster: 10,
    name: "Sean O'Neill",
    alias: "Seanzie aka Irish Beef",
    location: "Washington, DC",
    bio: "I don’t watch football. If you lose to me you should feel shame.",
    photo: "/managers/question.jpg",
    fantasyStart: 2014,
    favoriteTeam: "sf",
    favoritePlayer: 1426, // Tyler Lockett, babyyyyy
    philosophy: "I will never lose again - Shoresy",
    tradingScale: 3,
    preferredContact: "Sending",
  },
  {
    roster: 11,
    name: "Cal Arseneau",
    alias: "calarseneau aka Cal the Dragon",
    location: "Brooklyn",
    bio: "My my second and third toes are longer than my big toe on both feet",
    photo: "/managers/question.jpg",
    fantasyStart: 1929,
    favoriteTeam: "nyj", // The marlins
    favoritePlayer: 1426, // Chad Muma
    philosophy: "If you’re not first you’re last",
    tradingScale: 1,
    preferredContact: "Sleeper",
  },
  {
    roster: 12,
    name: "James",
    location: "Munich Bavaria Germany",
    bio: "Bees can perceive time",
    photo: "/managers/question.jpg",
    fantasyStart: 2014,
    favoriteTeam: "sf",
    favoritePlayer: 1426, // Derrick Henry
    philosophy:
      "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Navy Seals, and I've been involved in numerous secret raids on Al-Quaeda, and I have over 300 confirmed kills. I am trained in gorilla warfare and I'm the top sniper in the entire US armed forces. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Earth, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of spies across the USA and your IP is being traced right now so you better prepare for the storm, maggot. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bare hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the United States Marine Corps and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little 'clever' comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will shit fury all over you and you will drown in it. You're fucking dead, kiddo.",
    tradingScale: 10,
    preferredContact: "Sleeper",
  },
];

/*   !!  !!  IMPORTANT  !!  !! */
/*
  Below is the most up to-date version of a manager. Please leave this commented out
  and don't delete it. This will be updated if any fields are added, removed or changed
  and will allow updates without causing merge conflicts
  */

// {
//   "roster": 3,  // ID of the roster that the manager manages (look at the order of the power rankings graph)
//   "name": "Your Name",
//   "tookOver": 2020, // (optional) used if a manager took over a team, delete this line or change to null otherwise
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
