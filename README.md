# FantasyMaster

A dashboard for people who play fantasy football in several leagues at once. Link your Sleeper
account and your ESPN leagues, and see every league, every player you roster, and what each
player's game means for all of your matchups together.

Fantasy apps show one league at a time. If you start Bijan Robinson in one league and face him
in another, no single app tells you that a big game from him wins one matchup and loses the
other. FantasyMaster puts every league side by side and answers questions like that directly.

## What it does

**Leagues.** One card per league with your score, your opponent's, both teams' projections, and
a result: Won or Lost for past weeks, Projected win or Projected loss for the current and future
weeks. Open a card to see both starting lineups with each player's points and projection.

**My players.** Everyone you roster, across all leagues, ordered by how many leagues you're
starting them in. Each player shows their points and projection in every league (scoring
differs by league, so the same game is worth different points), plus injury tags: IR, Out,
Doubtful, Questionable.

**Win scenarios.** Search for any player starting in one of your matchups and see what he needs
to score in each league for you to win there: more than a threshold where you start him, fewer
than one where you face him. A stat-line calculator below lets you type a hypothetical game
(catches, yards, touchdowns) and see the result in every league at once. It opens on a line that
wins all your matchups when one exists, and can solve for a single stat ("at least 71 receiving
yards", "fewer than 234 passing yards"). It also says whether the player is yet to play, playing
now, or finished.

**Stats.** Your record, win percentage, games behind first, points per game and the league's
average in every league, with totals across all of them. Also the managers you share the most
leagues with and the players you roster most.

**Everywhere:** a week picker for any week of the season, live projections that update as games
finish, and linked accounts remembered in your browser between visits.

## Supported platforms

| Platform | How you link | Notes |
|----------|--------------|-------|
| Sleeper | Username | All of the user's leagues for the season load at once |
| ESPN, public leagues | League ID (or the league's web address), then pick your team | Works in a browser with no login |
| ESPN, private leagues | Same, after connecting your ESPN account in the app | Needs the app's server functions (on Vercel, or `npm run dev`) |
| Yahoo | Not supported | Listed in the form, but not built |

## Running it

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173) and enter a Sleeper username or an
ESPN league ID.

### Try it without an account

Mock mode runs entirely on saved, anonymized data from real leagues, with no network calls to
Sleeper or ESPN:

```bash
npm run dev:mock
```

Use the Sleeper username `demo_user` and the ESPN league ID `1000000001`. The data includes
deliberate edge cases: a league where you have a bye, one that hasn't drafted, and players you
start in one league and face in another.

### Private ESPN leagues

ESPN only shows a private league to its members, so the app needs two values from your espn.com
login (the `espn_s2` and `SWID` cookies). Choose ESPN in the linking form and click "Private
league? Connect your ESPN account"; the page walks you through finding the values in Chrome,
Edge, Firefox or Safari. It opens by itself if you try to add a private league first.

How it works: a web page isn't allowed to attach cookies to a request to another site, so two
small server functions in `api/` do it. `/api/espn-login` stores the values in your browser as a
cookie on this site that the page's JavaScript can't read, and `/api/espn` forwards private-league
requests to ESPN with them added. Nothing is saved on the server; the values stay in your browser
until you disconnect, and stop working when you sign out of ESPN. The proxy only ever fetches ESPN
fantasy league addresses.

Locally, `npm run dev` runs the same functions. In mock mode, ESPN league `2000000002` is a
pretend private league that opens after connecting with any two values.

### Deploying

The app is set up for [Vercel](https://vercel.com): import the GitHub repository, and Vercel builds
the Vite app and turns each file in `api/` into a server function. There are no environment
variables to set. On a host without server functions (any plain static host), everything works
except private ESPN leagues, and the app says so.

### Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Development server with live data |
| `npm run dev:mock` | Development server with saved mock data |
| `npm test` | Runs the test suite once |
| `npm run test:watch` | Re-runs affected tests on every save |
| `npm run check` | Type-check, lint and tests in one go |
| `npm run build` | Production build into `dist/` |
| `npm run update-players` | Refreshes the saved list of NFL player names (Sleeper asks that this be done at most once a day) |

## How it works

The app is a React + TypeScript single-page app built with Vite. The browser calls Sleeper's and
ESPN's APIs directly; the only server code is the two small functions in `api/` that private ESPN
leagues need. They're plain JavaScript (type-checked through JSDoc comments) so Vercel can run
them as they are.

**One interface, several platforms.** Each platform implements a small interface in
`src/platforms/types.ts` whose core is `getLeagueWeek(league, week)`. The Sleeper and ESPN code
each convert their platform's raw JSON into the app's own types (`League`, `Matchup`,
`PlayerPoints`), so nothing outside `src/platforms/` knows which platform a league came from.
Linking differs (a username for Sleeper, a league ID and team for ESPN), so that part lives in
platform-specific interfaces.

**One player ID across platforms.** Sleeper and ESPN number players differently. The ESPN code
translates every ESPN player into a Sleeper player ID, trying Sleeper's own record of the ESPN ID,
then name and position, then name and NFL team, and matching team defenses by team. That's what
lets a player rostered on both platforms count as one person.

**Scoring from stat lines.** A league's scoring rules are a table of points per stat
(`rec: 1`, `rec_yd: 0.1`, `rec_td: 6`), and a player's points are each stat times its value,
added up. ESPN's numbered rules are translated into the same stat names. This one formula drives
the stat-line calculator and turns Sleeper's projected stat lines into projected points under
each league's rules. It was checked against the platforms' own numbers: it reproduces all 1,221
player scores in the saved Sleeper data and every ESPN score tested.

**Live projections.** During a week, a team's projection counts finished players at what they
scored, unstarted players at their projection, and players mid-game at points so far plus the
projection scaled to the time left. Game states come from ESPN's public NFL scoreboard. For ESPN
leagues the app uses ESPN's own live figure; the calculation used for Sleeper leagues matched
ESPN's figure to within a cent when compared on the same players.

**Mock layer.** `src/platforms/mock/` implements the same interfaces from saved JSON in
`fixtures/`, reusing the real conversion code, so mock mode exercises everything except the
network.

**Tests.** 245 tests with Vitest, mostly on the pure logic: the platform conversions, player
matching, scoring, win thresholds, the stat-line search, the stats, and the server functions for
private leagues. Many check real numbers
from the fixtures end to end. Tests can't reach the network; `vitest.setup.ts` makes any attempt
fail.

### Project layout

```
src/
  platforms/        Talking to Sleeper and ESPN, and the app's shared types
    sleeper/        Sleeper API calls, raw types, conversion
    espn/           ESPN API calls, raw types, conversion, player matching, stat translation
    nfl/            The NFL scoreboard (which games are live or finished)
    mock/           Mock platforms and the saved fixtures
  hooks/            useLeagues (loading and state) and saved links
  components/       The React views
  players/          Combining players across leagues; injury tags
  scenarios/        Win thresholds, the stat-line calculator, game states, player search
  stats/            Cross-league records and comparisons
  styles/           Design tokens
  testing/          Helpers that load the mock data for tests
api/                Server functions for private ESPN leagues (one per address)
server/             Their logic, and the plugin that runs them under `npm run dev`
scripts/            The player-list refresh script
public/             The saved player list
```

## Data sources

All of these are called directly from the browser, except private ESPN leagues, which go through the app's own server function.

| Source | Used for | Documented? |
|--------|----------|-------------|
| Sleeper API (`api.sleeper.app/v1`) | Users, leagues, rosters, matchups, NFL state | Yes |
| Sleeper stats and projections | Real and projected stat lines, injury status | No |
| ESPN fantasy API (`lm-api-reads.fantasy.espn.com`) | ESPN leagues, teams, matchups, projections (private leagues through `/api/espn`) | No |
| ESPN NFL scoreboard (`site.api.espn.com`) | Which games are live or finished | No |

The undocumented ones can change without notice. Where one fails, the app carries on without what
it provides (no projections, no live game states) rather than failing the whole page.

## Limitations

- Win scenarios hold every other player at his current score; they don't yet use projections for
  players still to play.
- ESPN playoff weeks (15 onward) show no matchup.
- Private ESPN leagues need the server functions, so they don't work on a plain static host. The
  Vercel setup hasn't been tried on a live deployment yet.
- No rate limiting on the server functions.
- Yahoo isn't supported.
- Player names come from a saved list, so very new players show as "Unknown player" until
  `npm run update-players` is run.

FantasyMaster isn't affiliated with Sleeper or ESPN.
