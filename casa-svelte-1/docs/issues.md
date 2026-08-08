
FAILED:

- Make Tour requested bigger, move to the left of date picker, keep them close
- validation message: need VALID url (add validation)
- make countdown more compact in Card view

- persist text in storage for unsubmitted forms
- add issues to model

Issue
-----
id : string
description : string
type : string(BUG, UPGRADE)
status : string(Open, Closed)
priority : string(low, medium, high)

/api/collections/casa_issues/records/RECORD_ID

Token only required for update and delete, otherwise always accessible.

LOW-PRIORITY:

- prompt user, phone or mailto
- Absent nav url should NOT make app fall back to url

OK: (keep for regression)

- url is mandatory
- Make the score field not field-shaped, a bit more subtle
- status is READ-ONLY
- verdict undecided by default
- detail view, expand card, no second page
- Show a countdown to tour date in the card list/queue view (style is called glassmorphism)
- Tour date persisted
- Add a GO button in the cards which opens the navigation_url link
- Sorted cards order: SCHEDULED --> QUEUED --> ACCEPTED --> REJECTED
- REJECT --> crossed out, dimmed out, move to bottom
- Make Google reviews hidden expandable field
- Make lat,lon single field string in the form of lat,long (just trust user to put the right format for now)
- MAke score field read-only, not a field
- Allow to view properties details without edit mode
- Make distance from ref read-only
- Also, move tour_requested and and tour_date near the geo field
- Move base cost to top of form near address, must be the first thing to input
