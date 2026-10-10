// Downloads Sleeper's full NFL player list and saves a slimmed copy the app can load.
// Run with `npm run update-players`. Sleeper asks that this endpoint be called at most once a day.

import { writeFile } from 'node:fs/promises'

const SOURCE = 'https://api.sleeper.app/v1/players/nfl'
const OUTPUT = new URL('../public/sleeper-players.json', import.meta.url)

const response = await fetch(SOURCE)
if (!response.ok) {
  throw new Error(`Sleeper request failed (${response.status})`)
}
const players = await response.json()

// Keep three of the ~50 fields per player. Team defenses have no full_name.
const slim = {}
for (const [id, player] of Object.entries(players)) {
  slim[id] = {
    name: player.full_name ?? `${player.first_name} ${player.last_name}`,
    position: player.position ?? null,
    team: player.team ?? null,
  }
  // Used to recognise the same player in an ESPN league
  if (player.espn_id) slim[id].espnId = player.espn_id
}

await writeFile(OUTPUT, JSON.stringify(slim))
console.log(`Saved ${Object.keys(slim).length} players to public/sleeper-players.json`)
