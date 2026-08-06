

MODEL
______

Cards should follow a queue model. There a few states a card as:
- QUEUED: waiting for a reply from the agent for a scheduled tour
- SCHEDULED: tour_date has a valid datetime in the future, a countdown is initiated
- ACCEPTED: a unit has been viewed, assessed, and deemed acceptable, color code it
- REJECTED: a unit has been viewed, assessed, and deemed unacceptable, cross it and archive it (hidden from view)

- State
- added verdict: yes, no, maybe

UI
_____

Cards should follow a queue model. There a few states a card as:
- QUEUED: waiting for a reply from the agent for a scheduled tour
- SCHEDULED: tour_date has a valid datetime in the future, a countdown is initiated
- ACCEPTED: a unit has been viewed, assessed, and deemed acceptable, color code it
- REJECTED: a unit has been viewed, assessed, and deemed unacceptable, cross it and archive it (hidden from view)


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
