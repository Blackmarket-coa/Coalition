# `/api/v1/feed` Contract (Coalition Gateway)

This document captures the feed API contract used by `VerticalVideoFeed` so client and gateway stay in parity.

## Endpoint
- `GET /api/v1/feed`

## Query Parameters

| Param | Type | Required | Notes |
|---|---|---:|---|
| `interests` | comma-separated string | no | Interest tags from onboarding (e.g. `mutual aid,climate,jobs`). |
| `consented_location_precision` | `off` \| `none` \| `approximate` \| `precise` | no | Privacy mode from client consent state. |
| `joined_rooms` | comma-separated string | no | Matrix room ids the user is already in. |
| `language` | string | no | Locale/language preference (default `en`). |
| `ranking_model` | string | no | Ranking model selector (default `coalition_social_v1`). |
| `importance_score` | number (0-5) | no | Existing user rating signal alias. |
| `social_impact_score` | number (0-5) | no | Existing social impact signal alias. |
| `impact_score` | number (0-5) | no | Legacy impact alias (accepted). |
| `importance_signal` | number (0-5) | no | New explicit importance signal. |
| `impact_signal` | number (0-5) | no | New explicit impact signal. |
| `ranking_confidence` | number (0-1) | no | Optional confidence value from client. |
| `ratings_count` | integer | no | Optional user rating volume. |
| `community_ratings_count` | integer | no | Optional community rating volume. |
| `limit` | integer (1-100) | no | Max returned entries (default `12`). |

## Ranking Behavior

Gateway ranking is intentionally **importance/impact-first**:

1. Primary score: weighted importance + social impact.
2. Trust adjustment: trust score minus report-rate penalty.
3. Engagement contributes as a **secondary tie-breaker** only.
4. Joined-room and location precision provide small contextual boosts.

## Response Shape

```json
{
  "ranking_model": "coalition_social_v1",
  "signals_applied": {
    "importance": 4.0,
    "social_impact": 4.0,
    "ranking_confidence": 0.8,
    "ratings_count": 12,
    "community_ratings_count": 4,
    "consented_location_precision": "approximate"
  },
  "videos": [
    {
      "id": "vid_climate_001",
      "room_id": "!aid:coalition.local",
      "content": {
        "url": "https://cdn.coalition.local/feed/vid_climate_001.mp4",
        "thumbnail_url": "https://cdn.coalition.local/feed/vid_climate_001.jpg",
        "caption": "..."
      },
      "counts": {
        "likes": 291,
        "comments": 57,
        "shares": 41,
        "views": 8920
      },
      "trust": {
        "score": 0.92,
        "report_count": 2,
        "report_rate": 0.0002
      },
      "ranking": {
        "importance": 4.9,
        "social_impact": 4.8,
        "engagement": 0.74,
        "published_at": "2026-04-13T18:10:00.000Z"
      },
      "tags": ["mutual aid", "climate"],
      "language": "en"
    }
  ],
  "events": []
}
```

`VerticalVideoFeed` consumers should read entries from `videos` first and optionally merge `events` into the timeline if desired.
