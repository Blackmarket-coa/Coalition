# `/api/v1/feed` Contract (Coalition Gateway)

This document captures the feed API contract used by `VerticalVideoFeed` so client and gateway stay in parity.

## Endpoints

### `GET /api/v1/feed` — Ranked feed

#### Query Parameters

| Param | Type | Required | Notes |
|---|---|---:|---|
| `interests` | comma-separated string | no | Interest tags from onboarding (e.g. `mutual aid,climate,jobs`). |
| `consented_location_precision` | `off` \| `none` \| `approximate` \| `precise` | no | Privacy mode from client consent state. |
| `location_latitude` | number (−90 to 90) | no | User latitude; required for location-scoped delivery. Must have consented precision. |
| `location_longitude` | number (−180 to 180) | no | User longitude; paired with `location_latitude`. |
| `location_region_code` | string (2–32 chars) | no | ISO 3166-2 region code (e.g. `us-wa`). Used as fallback match for regional scope. |
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

#### Ranking Behavior

Gateway ranking is intentionally **importance/impact-first**:

1. Community ratings (submitted via `POST /api/v1/feed/ratings`) are merged into each item's importance and social impact values before scoring.
2. Primary score: weighted importance (60%) + social impact (40%).
3. Trust adjustment: trust score minus report-rate penalty.
4. Engagement contributes as a **secondary tie-breaker** only.
5. Joined-room and location precision provide small contextual boosts.
6. Distance decay: items whose origin is closer to the user score slightly higher than equidistant alternatives.

#### Location-Scoped Delivery

Items are filtered by their escalation stage before scoring:

| Escalation stage | Delivery rule |
|---|---|
| `local` | Delivered only within 25 km of the item's `origin`. |
| `regional` | Delivered within 250 km OR matching `region_code`. |
| `national` | Delivered everywhere. |
| No location consent | Only `national`-stage items, plus any item whose `room_id` is in `joined_rooms` or whose tags match `interests`. |

#### Escalation (local → regional → national)

An item's stage is computed from: importance/impact (47%) + recency (24%) + rating velocity (17%) + cross-community diversity (12%). Safety gates apply: minimum unique raters, anomaly score ceiling, report-rate caps. Content that passes the safety gates and exceeds stage thresholds automatically escalates.

#### Response Shape

```json
{
  "ranking_model": "coalition_social_v1",
  "signals_applied": {
    "importance": 4.0,
    "social_impact": 4.0,
    "ranking_confidence": 0.8,
    "ratings_count": 12,
    "community_ratings_count": 4,
    "consented_location_precision": "approximate",
    "location_context": "consented",
    "ratings_ingested": 3
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
      "counts": { "likes": 291, "comments": 57, "shares": 41, "views": 8920 },
      "trust": { "score": 0.92, "report_count": 2, "report_rate": 0.0002 },
      "ranking": {
        "importance": 4.9,
        "social_impact": 4.8,
        "engagement": 0.74,
        "published_at": "2026-04-13T18:10:00.000Z"
      },
      "rating_stats": {
        "unique_raters": 46,
        "importance_avg": 4.9,
        "impact_avg": 4.8
      },
      "origin": {
        "latitude": 47.6062,
        "longitude": -122.3321,
        "region_code": "us-wa"
      },
      "tags": ["mutual aid", "climate"],
      "language": "en",
      "geo_scope": "local",
      "escalation_stage": "local",
      "escalation_score": 0.64
    }
  ],
  "events": []
}
```

`VerticalVideoFeed` consumers should read entries from `videos` first and optionally merge `events` into the timeline if desired.

---

### `POST /api/v1/feed/ratings` — Submit importance/impact rating

Accepts a user's 1–5 rating for a feed item on either the `importance` or `impact` dimension. Ratings are aggregated per content item and feed back into ranking on subsequent `GET /api/v1/feed` calls.

#### Request Body

```json
{
  "content_id": "vid_climate_001",
  "dimension": "importance",
  "rating_value": 5,
  "user_id": "usr_abc123",
  "lifecycle_id": "rating:usr_abc123:lxyz:a1b2c3",
  "update_index": 1
}
```

| Field | Type | Required | Notes |
|---|---|---:|---|
| `content_id` | string | yes | ID of the rated feed item. |
| `dimension` | `importance` \| `impact` | yes | Which dimension is being rated. |
| `rating_value` | number (1–5) | yes | The rating. |
| `user_id` | string | yes | Submitting user. Last write per `(content_id, dimension, user_id)` wins. |
| `lifecycle_id` | string | no | Client-generated session identifier for deduplication. |
| `update_index` | integer | no | Monotonically increasing per lifecycle; client uses this to track updates. |

#### Response

```json
{ "accepted": true, "content_id": "vid_climate_001", "dimension": "importance" }
```

Returns `400` with `{ "error": "..." }` if the payload fails validation.

> **Storage note:** Ratings are stored in-memory; they do not survive gateway restarts. This matches the in-memory mock-data approach used by the rest of the gateway today.
