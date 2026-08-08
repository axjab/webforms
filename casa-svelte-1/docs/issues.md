
FAILED:

- warning
- icon
- find a way to computed coordinates from URL
- back up db
- auto backup db

LOW-PRIORITY (open):

- webhooks
- prompt user, phone or mailto
- Absent nav url should NOT make app fall back to url

Closed: (keep for regression)

- material icons for heat, water, power, internet, laundry, parking
- make issue a smaller button than entry and saved, and if possible replace the word Issues with a material icon symbolizing them.
- add issues to model
- add base cost to detail view
- make countdown more compact in Card view
- move all rejected entries in "archived" accordion similar to accepted ones
- fix style of card list, accordion regressed
- add URL validation for navigation url: DO NOT CHECK FOR NULL or EMPTY, just format
- copy/duplicate all error messages at the  bottom of the form, just under the save button
- cannot schedule tour date in the past
- persist text in storage for unsubmitted forms
- Make Tour requested bigger, move to the left of date picker, keep them close
- validation message: need VALID url (add validation)
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


NOTES:

Issue
-----
id : string
description : string
type : string(BUG, UPGRADE) 
status : string(Open, Closed)
priority : string(low, medium, high)

/api/collections/casa_issues/records/RECORD_ID

Token only required for update and delete, otherwise always accessible.

---
[svelte] ownership_invalid_mutationMutating unbound props (`record`, at src/​lib/​components/​PropertyForm.svelte:34:3) is strongly discouraged. Consider using `bind:record={...}` in src/routes/+page.svelte (or using a callback) instead
---