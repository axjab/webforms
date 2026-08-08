#!/bin/bash

set -eu

curl -X POST 'https://api.alj.cx/api/collections/casa_properties/records' \
  -H "Authorization: $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "address": "454 dfgdhhhfgdf",
    "url": "https://alj.cx/bhi666666i",
    "status": "QUEUED",
    "verdict": "UNDECIDED",
    "cost_base": 999,
    "cost_heat": null,
    "cost_internet": 40,
    "cost_laundry": 35,
    "cost_other": [],
    "cost_parking": null,
    "cost_power": 60,
    "cost_utilities": null,
    "cost_water": null,
    "distance_from_ref": 16.4,
    "has_gym": false,
    "has_parking": false,
    "has_pool": false,
    "has_storage": false,
    "is_furnished": false,
    "laundry_type": "coin-operated",
    "navigation_url": null,
    "notes": "where the fuck are my notes bro",
    "parking_nearby": false,
    "score": null,
    "tour_date": null,
    "tour_requested": false,
    "coordinates_input": "45.424507,-75.8038045",
    "coordinates": {
      "lat": 45.424507,
      "lon": -75.8038045
    }
  }'
