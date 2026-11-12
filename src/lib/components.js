import Nav from './Nav/index.svelte';
import Footer from './Footer.svelte';
import News from './News/index.svelte';
import Resources from './Resources.svelte';
import Awards from './Awards/Awards.svelte';
import Rosters from './Rosters/Rosters.svelte';
import Rivalry from './Rivalry/index.svelte';
// AAA-Raymond: homepage "Recent Moves" (trades + waivers grouped by day) replaces the template's Transactions
import Transactions from './AAA-Raymond/components/RayTransactions/RecentMoves.svelte';
import TransactionsPage from './Transactions/TransactionsPage.svelte';
import MatchupsAndBrackets from './Matchups/MatchupsAndBrackets.svelte';
import Pagination from './Pagination.svelte';
import Drafts from './Drafts/index.svelte';
// AAA-Raymond: redesigned Records page (option A)
import Records from './AAA-Raymond/components/RayRecords/index.svelte';
// AAA-Raymond: redesigned Managers list and manager pages (option A)
import Manager from './AAA-Raymond/components/RayManagers/ManagerPage.svelte';
import AllManagers from './AAA-Raymond/components/RayManagers/ManagersList.svelte';
import PowerRankings from './PowerRankings/index.svelte';
import HomePost from './BlogPosts/HomePost.svelte';
import FullPost from './BlogPosts/FullPost.svelte';
import Posts from './BlogPosts/Posts.svelte';
import Standings from './Standings/index.svelte';
import RosterAnalysis from "./AAA-Raymond/components/RosterAnalysis/index.svelte";

import RayHome from "./AAA-Raymond/components/RayHome/index.svelte";
import RayStandings from "./AAA-Raymond/components/RayStandings/index.svelte";
import RayTrends from "./AAA-Raymond/components/RayTrends/index.svelte";

export {
    Nav,
    Footer,
    Awards,
    Rosters,
    Rivalry,
    Transactions,
    TransactionsPage,
    News,
    Resources,
    MatchupsAndBrackets,
    Pagination,
    Drafts,
    Records,
    Manager,
    AllManagers,
    PowerRankings,
    HomePost,
    Posts,
    FullPost,
    Standings,
    RosterAnalysis,
    RayHome,
    RayStandings,
    RayTrends
};
