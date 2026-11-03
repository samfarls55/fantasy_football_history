export const sampleHistory = {
  "sample": true,
  "notice": "Synthetic records for the home-page build. Actual Sleeper league history has not been imported.",
  "importStatus": "not-connected",
  "lastSuccessfulUpdate": null,
  "league": {
    "name": "Farls da bag",
    "seedLeagueId": "1385327861673529344"
  },
  "teams": {
    "monkey": {
      "name": "The Monkey Buccaneers",
      "identityScope": "Current display assets only; no historical identity claim.",
      "featureImage": "/assets/plates/achievement-logo.png",
      "historyImage": "/assets/plates/history-logo.png"
    },
    "champion": {
      "name": "2025 Champion",
      "identityScope": "Current team display name; this name is not evidence of a championship.",
      "featureImage": "/assets/plates/bench-portrait.png"
    }
  },
  "records": [
    {
      "id": "uncrowned-2024",
      "kind": "season-dominance-without-title",
      "title": "Best season without a title",
      "teamKey": "monkey",
      "scope": "regular",
      "season": 2024,
      "addedOrder": 3,
      "source": {
        "type": "synthetic-season",
        "complete": true,
        "champion": false,
        "teamPoints": 1736,
        "teamGames": 14,
        "leaguePoints": 14000,
        "leagueTeamGames": 140
      }
    },
    {
      "id": "bench-2023-week-7",
      "kind": "benched-player-high",
      "title": "Highest-scoring benched player",
      "teamKey": "champion",
      "scope": "regular",
      "season": 2023,
      "week": 7,
      "addedOrder": 2,
      "source": {
        "type": "synthetic-lineup",
        "complete": true,
        "playerName": "Sample receiver",
        "playerPoints": 38.7,
        "lineupStatus": "bench",
        "substitutionEligibility": "unknown"
      }
    },
    {
      "id": "playoff-2024-week-15",
      "kind": "official-team-high",
      "title": "Playoff scoring high",
      "teamKey": "monkey",
      "scope": "playoffs",
      "season": 2024,
      "week": 15,
      "addedOrder": 1,
      "source": {
        "type": "synthetic-matchup",
        "complete": true,
        "homeTeamKey": "monkey",
        "awayTeamKey": "champion",
        "homePoints": 162.4,
        "awayPoints": 129.1,
        "officialPoints": 162.4,
        "commissionerOverride": false
      }
    }
  ]
} as const;
