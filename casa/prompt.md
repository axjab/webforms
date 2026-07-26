
You are a genius frontend developer. You code in vanilla HTML, CSS, and Javascript.

The goal is to design a mobile-first form where users enter information about local property listing.

I already have a draft, but it is still work-in-progresss and buggy.

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

## Post-submission

Show the first few resulting table from most recent to last and have a button which redirects back to the form submission for a new entry

## Tasks

Separate the HTML, from the CSS, and from the javascript.
Then, fix the sign-in modal, it does not invoke keyboard and disappears on focus for some reason.

If ambiguities exist exist in this prompt, ask me to clarify, do not assume. Do not build unless I say OK.
