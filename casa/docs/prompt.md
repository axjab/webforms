
You are a genius frontend developer.

The goal is to design a mobile-first form where users enter information about local property listing.
The application already exists, you are not building from scratch, but making ONLY the necessary changes.

The current frontend has drifted from the backend, the model has been updated.

## Authentication

There is only one user: "x@alj.cx". When prompting for sign-in, ONLY accept a password, set user as "x@alj.cx" by default, it's ok to expose it in the frontend.
Non-authenticated users may still interact with the form, they just can't POST is all.

To authenticate, you must POST:

```
POST \
  -H 'Content-Type:application/json' \
  -d '{ "identity":"x@alj.cx", "password":"YOUR_PASSWORD" }' \
  'https://api.alj.cx/api/collections/users/auth-with-password'
```

which will return

```json
{
  "token": "...JWT...",
  "record": {
    "collectionId": "_pb_users_auth_",
    "collectionName": "users",
    "id": "09kjg0d6q14rz7a",
    "email": "test_922@example.com",
    "emailVisibility": true,
    "verified": false,
    "name": "example text",
    "avatar": "test_yqklwzguko.txt",
    "created": "2026-07-26 18:57:10.631Z",
    "updated": "2026-07-26 18:57:10.631Z"
  }
}
```

## CRUD API

Listing: GET -H "Authorization:TOKEN"   'https://api.alj.cx/api/collections/casa_properties/records'

Creating: POST \
  -H 'Authorization:TOKEN' \
  -H 'Content-Type:application/json' \
  -d '{ ... }' \
  'https://api.alj.cx/api/collections/casa_properties/records/RECORD_ID

Updating: PATCH \
  -H 'Authorization:TOKEN' \
  -H 'Content-Type:application/json' \
  -d '{ ... }' \
  'https://api.alj.cx/api/collections/casa_properties/records

Deleting: DELETE \
  -H 'Authorization:TOKEN' \
  'https://api.alj.cx/api/collections/casa_properties/records

For creating and updating, allow the Javascript code to be extended to include validation functions to be implemented in the future.

## Model

ADDITIONS NOT IN THE UI YET:
- status: one of QUEUED, SCHEDULED, REJECTED, ACCEPTED
- verdict: one of UNDECIDED (default), YES, NO, MAYBE
- tour_requested: whether a tour request has been sent to the contact or not
- tour_date: the date and time of the tour once confirmed
- navigation_url: an app-agnostic link to a map location, always auto-prepended with "mapfwd.com/"

```json
"items": [
    {
      "collectionId": "pbc_3234394062",
      "collectionName": "casa_properties",
      "id": "ngo7inefsli5t1g",
      "address": "example text",
      "url": "https://example.com",
      "contact": "example text",
      "tour_requested": false,
      "tour_date": "2026-08-05 12:45:52.009Z",
      "navigation_url": "https://mapfwd.com/https://example.com",
      "coordinates": {
        "lon": 0,
        "lat": 0
      },
      "distance_from_ref": 123.456,
      "status": "QUEUED",
      "has_parking": false,
      "parking_nearby": false,
      "has_storage": true,
      "has_gym": false,
      "has_pool": false,
      "is_furnished": false,
      "laundry_type": "coin-operated",
      "cost_base": 123.456,
      "cost_heat": 123.456,
      "cost_water": 123.456,
      "cost_power": 123.456,
      "cost_internet": 123.456,
      "cost_laundry": 123.456,
      "cost_parking": 123.456,
      "cost_other": {
        "example": 123
      },
      "reviews": "example text",
      "notes": "Lorem ipsum dolor sit amet...",
      "move_in": "2026-08-05 12:45:52.009Z",
      "score": 123.456,
      "verdict": "UNDECIDED",
      "created": "2026-08-05 12:45:52.009Z",
      "updated": "2026-08-05 12:45:52.009Z"
    },
    {
      "collectionId": "pbc_3234394062",
      "collectionName": "casa_properties",
      "id": "ngo7inefsli5t1g",
      "address": "example text",
      "url": "https://example.com",
      "contact": "example text",
      "tour_requested": false,
      "tour_date": "2026-08-05 12:45:52.009Z",
      "navigation_url": "https://mapfwd.com/https://example.com",
      "coordinates": {
        "lon": 0,
        "lat": 0
      },
      "distance_from_ref": 123.456,
      "status": "QUEUED",
      "has_parking": false,
      "parking_nearby": false,
      "has_storage": true,
      "has_gym": false,
      "has_pool": false,
      "is_furnished": false,
      "laundry_type": "coin-operated",
      "cost_base": 123.456,
      "cost_heat": 123.456,
      "cost_water": 123.456,
      "cost_power": 123.456,
      "cost_internet": 123.456,
      "cost_laundry": 123.456,
      "cost_parking": 123.456,
      "cost_other": {
        "example": 123
      },
      "reviews": "example text",
      "notes": "Lorem ipsum dolor sit amet...",
      "move_in": "2026-08-05 12:45:52.009Z",
      "score": 123.456,
      "verdict": "UNDECIDED",
      "created": "2026-08-05 12:45:52.009Z",
      "updated": "2026-08-05 12:45:52.009Z"
    }
  ]
```

## Post-submission

Show the first few resulting table from most recent to last and have a button which redirects back to the form submission for a new entry

## Tasks

0. Show a countdown to tour date in the card list/queue view
1. Make lat,lon single field string in the form of lat,long (just trust user to put the right format for now)
3. Move base cost to top of form near address, must be the first thing to input
4. Also, move tour_requested and and tour_date near the geo field
5. Remove "assessment" fields, use notes instead
6. MAke score field read-only, not a field
7. Make distance from ref read-only
8. Make Google reviews hidden expandable field
9. Add a GO button in the cards which opens the navigation_url link
10. Link to favicon.png
11. Make contact tel: and mailto: clickable
12. Allow to view properties details without edit mode

## Final notes and meta-instructions

- I intentionally omitted the CSS to focus on structure and behaviour. Any style you provide me will simply appended to the CSS file.
- If ambiguities exist in this prompt, ask me to clarify, do not assume, or make unfounded decisions.
  Do not build unless I say OK.
- Only modify what is affected by the tasks listed above, do not modify other components, like the auth flow for example, which works perfectly.
