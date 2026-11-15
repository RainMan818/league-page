// AAA-Raymond: the template's News, Resources, Awards, Rosters, PowerRankings and Standings components were deleted
// (Nov 15; replaced by the Ray* pages), so they're no longer exported here.
import Nav from './Nav/index.svelte';
import Footer from './Footer.svelte';
// AAA-Raymond: redesigned Rivalry page (option A)
import Rivalry from './AAA-Raymond/components/RayRivalry/index.svelte';
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
import HomePost from './BlogPosts/HomePost.svelte';
import FullPost from './BlogPosts/FullPost.svelte';
import Posts from './BlogPosts/Posts.svelte';
import RosterAnalysis from "./AAA-Raymond/components/RosterAnalysis/index.svelte";

import RayHome from "./AAA-Raymond/components/RayHome/index.svelte";
import RayStandings from "./AAA-Raymond/components/RayStandings/index.svelte";
import RayTrends from "./AAA-Raymond/components/RayTrends/index.svelte";

export {
    Nav,
    Footer,
    Rivalry,
    Transactions,
    TransactionsPage,
    MatchupsAndBrackets,
    Pagination,
    Drafts,
    Records,
    Manager,
    AllManagers,
    HomePost,
    Posts,
    FullPost,
    RosterAnalysis,
    RayHome,
    RayStandings,
    RayTrends
};
