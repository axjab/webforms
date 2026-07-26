/* ═══════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════ */
const BASE_URL       = 'https://api.alj.cx';
const AUTH_IDENTITY  = 'x@alj.cx'; // only user — hardcoded per spec, safe to expose

/* ═══════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════ */
let authToken  = null;
let authUser   = null;
let records    = [];   // last fetched listing, most recent first
let editingId  = null; // set while editing an existing record

/* ═══════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════ */
function toggleLoginPanel() {
  if (authToken) return; // badge click does nothing when authenticated
  const overlay  = document.getElementById('login-overlay');
  const errEl    = document.getElementById('login-error');
  const password = document.getElementById('login-password');
  errEl.style.display = 'none';
  overlay.classList.add('open');
  // focus after the sheet has started animating in so mobile keyboards behave
  requestAnimationFrame(() => requestAnimationFrame(() => password.focus()));
}

function closeLoginPanel() {
  document.getElementById('login-overlay').classList.remove('open');
}

async function login() {
  const password  = document.getElementById('login-password').value;
  const errEl     = document.getElementById('login-error');
  const btn       = document.getElementById('login-btn');

  errEl.style.display = 'none';
  btn.textContent = 'Signing in…';
  btn.disabled = true;

  try {
    const res  = await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ identity: AUTH_IDENTITY, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Authentication failed');

    authToken = data.token;
    authUser  = data.record;
    document.getElementById('login-password').value = '';
    updateAuthUI();
    closeLoginPanel();

    // if the saved-listings tab is currently open, populate it now that we can
    if (document.getElementById('tab-list').classList.contains('active')) {
      fetchListing();
    }
  } catch (err) {
    errEl.textContent    = err.message;
    errEl.style.display  = 'block';
  } finally {
    btn.textContent = 'Sign in';
    btn.disabled    = false;
  }
}

function logout(event) {
  event.stopPropagation();
  authToken = null;
  authUser  = null;
  records   = [];
  updateAuthUI();

  // saved listings require auth — bounce back to the form if we were viewing them
  if (document.getElementById('tab-list').classList.contains('active')) {
    switchToFormView();
  }
}

function updateAuthUI() {
  const badge   = document.getElementById('auth-badge');
  const label   = document.getElementById('auth-label');
  const signout = document.getElementById('auth-signout');
  const hint    = document.getElementById('connection-hint');

  if (authToken) {
    badge.classList.add('authenticated');
    label.textContent     = authUser?.name || authUser?.email || 'Authenticated';
    signout.style.display = 'inline';
    hint.textContent      = `→ Connected to ${BASE_URL.replace(/^https?:\/\//, '')}`;
  } else {
    badge.classList.remove('authenticated');
    label.textContent     = 'NOT AUTHENTICATED';
    signout.style.display = 'none';
    hint.textContent      = '→ Not connected — submit will dry run';
  }
  refreshSubmitButtonState();
}

/* ═══════════════════════════════════════════════════════
   VIEW SWITCHING (form ⇄ saved listings)
═══════════════════════════════════════════════════════ */
function switchToFormView() {
  const alreadyOnForm = document.getElementById('tab-form').classList.contains('active');
  if (editingId) {
    // leaving an edit via "+ New entry" — cancel it and start fresh
    clearEditingState();
    resetForm();
  } else if (!alreadyOnForm) {
    // arriving from the list view with no edit in progress — start fresh
    resetForm();
  }
  // if already on the form view with no edit in progress, leave any
  // in-progress (unsaved) new-entry values alone
  document.getElementById('view-form').classList.add('active');
  document.getElementById('view-list').classList.remove('active');
  document.getElementById('tab-form').classList.add('active');
  document.getElementById('tab-list').classList.remove('active');
}

async function switchToListView() {
  document.getElementById('view-form').classList.remove('active');
  document.getElementById('view-list').classList.add('active');
  document.getElementById('tab-form').classList.remove('active');
  document.getElementById('tab-list').classList.add('active');

  if (!authToken) {
    document.getElementById('list-summary').textContent = '—';
    document.getElementById('property-cards').innerHTML = renderEmptyState(
      'Sign in to view saved listings',
      'Saved listings are fetched with your auth token, so sign in first.'
    );
    return;
  }
  await fetchListing();
}

/* ═══════════════════════════════════════════════════════
   CHIP TOGGLES
═══════════════════════════════════════════════════════ */
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('active'));
});

function getChipValue(fieldName) {
  const chip = document.querySelector(`.chip[data-field="${fieldName}"]`);
  return chip ? chip.classList.contains('active') : false;
}

function setChipValue(fieldName, value) {
  const chip = document.querySelector(`.chip[data-field="${fieldName}"]`);
  if (chip) chip.classList.toggle('active', !!value);
}

/* ═══════════════════════════════════════════════════════
   COST OTHER
═══════════════════════════════════════════════════════ */
function addCostOther(label = '', amount = '') {
  const container = document.getElementById('cost-other-rows');
  const row = document.createElement('div');
  row.className = 'cost-other-row';
  row.innerHTML = `
    <input type="text"   placeholder="label (e.g. storage)" />
    <input type="number" placeholder="0" oninput="updateTotal()" />
    <button type="button" class="btn-remove-other" onclick="removeCostOther(this)">−</button>
  `;
  const [labelInput, valueInput] = row.querySelectorAll('input');
  labelInput.value = label;
  valueInput.value = amount;
  container.appendChild(row);
}

function removeCostOther(btn) {
  btn.parentElement.remove();
  updateTotal();
}

function getCostOther() {
  const result = {};
  document.querySelectorAll('#cost-other-rows .cost-other-row').forEach(row => {
    const [labelInput, valueInput] = row.querySelectorAll('input');
    const key = labelInput.value.trim();
    const val = parseFloat(valueInput.value) || 0;
    if (key) result[key] = val;
  });
  return result;
}

/* ═══════════════════════════════════════════════════════
   COST TOTAL
═══════════════════════════════════════════════════════ */
function updateTotal() {
  const costFields = ['cost_base','cost_heat','cost_water','cost_power',
                      'cost_internet','cost_laundry','cost_parking'];

  let total = costFields.reduce((sum, id) => {
    return sum + (parseFloat(document.getElementById(id).value) || 0);
  }, 0);

  // add cost_other values
  document.querySelectorAll('#cost-other-rows .cost-other-row input[type=number]').forEach(input => {
    total += parseFloat(input.value) || 0;
  });

  const el = document.getElementById('cost-total');
  el.textContent = `$${total.toFixed(0)}`;
  el.classList.remove('warn', 'over');
  if (total > 1500) el.classList.add('over');
  else if (total > 1300) el.classList.add('warn');
}

/* ═══════════════════════════════════════════════════════
   BUILD PAYLOAD
═══════════════════════════════════════════════════════ */
function buildPayload() {
  const get   = id => document.getElementById(id).value.trim();
  const num   = id => { const v = get(id); return v !== '' ? parseFloat(v) : undefined; };
  const text  = id => get(id) || undefined;

  const lat = get('lat');
  const lon = get('lon');

  const payload = {
    address:          get('address'),
    url:              text('url'),
    contact:          text('contact'),
    coordinates:      (lat && lon) ? { lat: parseFloat(lat), lon: parseFloat(lon) } : undefined,
    distance_from_ref: num('distance_from_ref'),
    has_parking:      getChipValue('has_parking'),
    parking_nearby:   getChipValue('parking_nearby'),
    has_storage:      getChipValue('has_storage'),
    has_gym:          getChipValue('has_gym'),
    has_pool:         getChipValue('has_pool'),
    is_furnished:     getChipValue('is_furnished'),
    laundry_type:     get('laundry_type'),
    cost_base:        num('cost_base'),
    cost_heat:        num('cost_heat') ?? 0,
    cost_water:       num('cost_water') ?? 0,
    cost_power:       num('cost_power') ?? 0,
    cost_internet:    num('cost_internet') ?? 0,
    cost_laundry:     num('cost_laundry') ?? 0,
    cost_parking:     num('cost_parking') ?? 0,
    cost_other:       getCostOther(),
    reviews:          text('reviews'),
    assessment:       text('assessment'),
    notes:            text('notes'),
    nabila_rating:    num('nabila_rating'),
    move_in:          text('move_in'),
    score:            num('score'),
  };

  // remove undefined keys to keep payload clean
  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
}

/* ═══════════════════════════════════════════════════════
   VALIDATION — extend these as rules are defined later.
   Both must return { valid: boolean, errors: string[] }.
═══════════════════════════════════════════════════════ */
function validateForCreate(payload) {
  // TODO: add create-specific validation rules here
  return { valid: true, errors: [] };
}

function validateForUpdate(payload, id) {
  // TODO: add update-specific validation rules here
  return { valid: true, errors: [] };
}

/* ═══════════════════════════════════════════════════════
   SUBMIT (create or update, depending on editingId)
═══════════════════════════════════════════════════════ */
function refreshSubmitButtonState() {
  const btn = document.getElementById('btn-submit');
  if (!authToken) {
    btn.textContent = '⚠ Dry run — not authenticated';
    btn.classList.add('dry-run');
    return;
  }
  btn.classList.remove('dry-run');
  btn.textContent = editingId ? 'Update property' : 'Save property';
}

async function submit() {
  closeStatus();

  if (!document.getElementById('address').value.trim()) {
    showStatus('error', 'Address is required.');
    return;
  }
  if (!document.getElementById('cost_base').value) {
    showStatus('error', 'Base cost is required.');
    return;
  }

  const payload   = buildPayload();
  const isUpdate  = !!editingId;

  // ── dry run (not authenticated) ─────────────────────
  if (!authToken) {
    document.getElementById('dry-run-title').textContent = isUpdate
      ? `⚠ Dry run — PATCH payload (record ${editingId}, not saved)`
      : '⚠ Dry run — POST payload (not saved)';
    document.getElementById('dry-run-pre').textContent = JSON.stringify(payload, null, 2);
    document.getElementById('dry-run-panel').classList.add('open');
    return;
  }

  const validation = isUpdate ? validateForUpdate(payload, editingId) : validateForCreate(payload);
  if (!validation.valid) {
    showStatus('error', validation.errors.join(' ') || 'Validation failed.');
    return;
  }

  // ── actual POST / PATCH ──────────────────────────────
  const btn = document.getElementById('btn-submit');
  btn.disabled    = true;
  btn.textContent = isUpdate ? 'Updating…' : 'Saving…';

  try {
    const url = isUpdate
      ? `${BASE_URL}/api/collections/casa_properties/records/${editingId}`
      : `${BASE_URL}/api/collections/casa_properties/records`;

    const res = await fetch(url, {
      method:  isUpdate ? 'PATCH' : 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': authToken,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || (isUpdate ? 'Update failed' : 'Create failed'));

    showStatus('success', isUpdate ? `Updated — record ${data.id}` : `Saved — record ${data.id}`);
    resetForm();
    clearEditingState();
    await switchToListView(); // post-submission: land on the most-recent-first listing
  } catch (err) {
    showStatus('error', err.message);
  } finally {
    btn.disabled = false;
    refreshSubmitButtonState();
  }
}

/* ═══════════════════════════════════════════════════════
   RESET / EDIT STATE
═══════════════════════════════════════════════════════ */
function resetForm() {
  ['address','url','contact','lat','lon','distance_from_ref',
   'cost_base','reviews','assessment','notes','nabila_rating','move_in','score']
    .forEach(id => document.getElementById(id).value = '');

  document.getElementById('cost_heat').value     = '80';
  document.getElementById('cost_water').value    = '0';
  document.getElementById('cost_power').value    = '80';
  document.getElementById('cost_internet').value = '65';
  document.getElementById('cost_laundry').value  = '35';
  document.getElementById('cost_parking').value  = '0';
  document.getElementById('laundry_type').value  = 'shared';
  document.getElementById('cost-other-rows').innerHTML = '';
  document.querySelectorAll('.chip.active').forEach(c => c.classList.remove('active'));
  updateTotal();
}

function populateForm(record) {
  const set = (id, value) => { document.getElementById(id).value = (value ?? '') === null ? '' : value; };

  set('address', record.address);
  set('url', record.url);
  set('contact', record.contact);
  set('lat', record.coordinates?.lat);
  set('lon', record.coordinates?.lon);
  set('distance_from_ref', record.distance_from_ref);
  set('laundry_type', record.laundry_type || 'shared');
  set('move_in', record.move_in);
  set('cost_base', record.cost_base);
  set('cost_heat', record.cost_heat ?? 0);
  set('cost_water', record.cost_water ?? 0);
  set('cost_power', record.cost_power ?? 0);
  set('cost_internet', record.cost_internet ?? 0);
  set('cost_laundry', record.cost_laundry ?? 0);
  set('cost_parking', record.cost_parking ?? 0);
  set('reviews', record.reviews);
  set('assessment', record.assessment);
  set('notes', record.notes);
  set('nabila_rating', record.nabila_rating);
  set('score', record.score);

  document.getElementById('cost-other-rows').innerHTML = '';
  Object.entries(record.cost_other || {}).forEach(([label, amount]) => addCostOther(label, amount));

  ['has_parking','parking_nearby','has_storage','has_gym','has_pool','is_furnished']
    .forEach(field => setChipValue(field, record[field]));

  updateTotal();
}

function editRecord(id) {
  const record = records.find(r => r.id === id);
  if (!record) {
    showStatus('error', 'Could not find that record — try refreshing the list.');
    return;
  }

  populateForm(record);
  editingId = id;

  const banner = document.getElementById('editing-banner');
  document.getElementById('editing-banner-text').textContent = `Editing: ${record.address}`;
  banner.classList.add('visible');

  document.getElementById('view-form').classList.add('active');
  document.getElementById('view-list').classList.remove('active');
  document.getElementById('tab-form').classList.add('active');
  document.getElementById('tab-list').classList.remove('active');

  refreshSubmitButtonState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
  clearEditingState();
  resetForm();
}

function clearEditingState() {
  editingId = null;
  document.getElementById('editing-banner').classList.remove('visible');
  refreshSubmitButtonState();
}

async function deleteRecord(id) {
  const record = records.find(r => r.id === id);
  const label  = record ? record.address : id;
  if (!confirm(`Delete "${label}"? This can't be undone.`)) return;

  const card = Array.from(document.querySelectorAll('.property-card')).find(el => el.dataset.id === id);
  const deleteBtn = card?.querySelector('.btn-card-delete');
  if (deleteBtn) { deleteBtn.disabled = true; deleteBtn.textContent = 'Deleting…'; }

  try {
    const res = await fetch(`${BASE_URL}/api/collections/casa_properties/records/${id}`, {
      method:  'DELETE',
      headers: { 'Authorization': authToken },
    });
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Delete failed');
    }

    records = records.filter(r => r.id !== id);
    if (editingId === id) cancelEdit();
    renderPropertyCards();
    showStatus('success', `Deleted — ${label}`);
  } catch (err) {
    showStatus('error', err.message);
    if (deleteBtn) { deleteBtn.disabled = false; deleteBtn.textContent = 'Delete'; }
  }
}

/* ═══════════════════════════════════════════════════════
   SAVED LISTINGS (GET, most recent first)
═══════════════════════════════════════════════════════ */
async function fetchListing() {
  const container = document.getElementById('property-cards');
  const summary    = document.getElementById('list-summary');
  summary.textContent  = 'Loading…';
  container.innerHTML  = renderEmptyState('Loading…', 'Fetching your saved listings.');

  try {
    const res  = await fetch(`${BASE_URL}/api/collections/casa_properties/records?sort=-created`, {
      headers: { 'Authorization': authToken },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load listings');

    records = data.items || [];
    document.getElementById('tab-list-count').textContent = data.totalItems != null ? `(${data.totalItems})` : '';

    if (records.length === 0) {
      summary.textContent = '0 saved';
      container.innerHTML = renderEmptyState('No listings yet', 'Properties you save will show up here, most recent first.');
      return;
    }

    summary.textContent = `${records.length} of ${data.totalItems} — most recent first`;
    renderPropertyCards();
  } catch (err) {
    summary.textContent = 'Error';
    container.innerHTML = renderEmptyState("Couldn't load listings", err.message);
  }
}

function renderPropertyCards() {
  const container = document.getElementById('property-cards');
  if (records.length === 0) {
    document.getElementById('list-summary').textContent = '0 saved';
    container.innerHTML = renderEmptyState('No listings yet', 'Properties you save will show up here, most recent first.');
    return;
  }
  container.innerHTML = records.map(renderCard).join('');
}

function renderCard(record) {
  const total  = recordTotal(record);
  const badges = [
    ['has_parking', 'Parking'], ['parking_nearby', 'Parking nearby'],
    ['has_storage', 'Storage'], ['has_gym', 'Gym'],
    ['has_pool', 'Pool'], ['is_furnished', 'Furnished'],
  ].filter(([field]) => record[field]).map(([, label]) =>
    `<span class="property-card-badge">${escapeHtml(label)}</span>`
  ).join('');

  return `
    <div class="property-card" data-id="${escapeHtml(record.id)}">
      <div class="property-card-header">
        <span class="property-card-address">${escapeHtml(record.address || 'Untitled')}</span>
        <span class="property-card-score">Score ${escapeHtml(String(record.score ?? '—'))}</span>
      </div>
      <div class="property-card-meta">
        <span class="mono">${formatMoney(total)}/mo</span>
        <span>Rating ${escapeHtml(String(record.nabila_rating ?? '—'))}/10</span>
        <span>${escapeHtml(formatDate(record.created))}</span>
      </div>
      ${badges ? `<div class="property-card-badges">${badges}</div>` : ''}
      <div class="property-card-actions">
        <button type="button" class="btn-card-action btn-card-edit">Edit</button>
        <button type="button" class="btn-card-action btn-card-delete">Delete</button>
      </div>
    </div>
  `;
}

function renderEmptyState(title, text) {
  return `
    <div class="empty-state">
      <span class="empty-state-title">${escapeHtml(title)}</span>
      <span class="empty-state-text">${escapeHtml(text)}</span>
    </div>
  `;
}

// event delegation for card actions — avoids re-binding listeners on every render
document.getElementById('property-cards').addEventListener('click', e => {
  const card = e.target.closest('.property-card');
  if (!card) return;
  const id = card.dataset.id;
  if (e.target.closest('.btn-card-edit'))   editRecord(id);
  if (e.target.closest('.btn-card-delete')) deleteRecord(id);
});

/* ═══════════════════════════════════════════════════════
   FORMATTING HELPERS
═══════════════════════════════════════════════════════ */
function recordTotal(record) {
  const base = ['cost_base','cost_heat','cost_water','cost_power','cost_internet','cost_laundry','cost_parking']
    .reduce((sum, key) => sum + (parseFloat(record[key]) || 0), 0);
  const other = Object.values(record.cost_other || {}).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  return base + other;
}

function formatMoney(n) {
  return `$${Math.round(n)}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T'));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ═══════════════════════════════════════════════════════
   DRY RUN PANEL
═══════════════════════════════════════════════════════ */
function closeDryRun() {
  document.getElementById('dry-run-panel').classList.remove('open');
}

/* ═══════════════════════════════════════════════════════
   STATUS BAR
═══════════════════════════════════════════════════════ */
function showStatus(type, msg) {
  const bar = document.getElementById('status-bar');
  document.getElementById('status-msg').textContent = msg;
  bar.className = `status-bar visible ${type}`;
  bar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeStatus() {
  document.getElementById('status-bar').className = 'status-bar';
}

/* ═══════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════ */
updateTotal();
updateAuthUI();
