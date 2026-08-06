<script>
  import { onMount } from 'svelte';

  let identity = 'x@alj.cx';
  let password = '';
  let token = '';
  let isAuthenticated = false;
  let showLoginModal = false;
  let loginError = '';

  let currentTab = 'form';
  let properties = [];
  let editingId = null;
  let expandedDetailsId = null;
  let dryRunOutput = null;

  let form = {
    address: '',
    url: '',
    contact: '',
    coordsRaw: '',
    laundry_type: 'in-unit',
    move_in: '',
    has_parking: false,
    parking_nearby: false,
    has_storage: false,
    has_gym: false,
    has_pool: false,
    is_furnished: false,
    cost_base: '',
    cost_heat: 80,
    cost_water: 0,
    cost_power: 80,
    cost_internet: 65,
    cost_laundry: 35,
    cost_parking: 0,
    cost_other: [],
    tour_requested: false,
    tour_date: '',
    navigation_url: '',
    reviews: '',
    notes: ''
  };

  const API_BASE = 'https://api.alj.cx/api/collections/casa_properties/records';
  const AUTH_URL = 'https://api.alj.cx/api/collections/users/auth-with-password';

  const customValidators = [
    (data) => (!data.address ? 'Address is required.' : null),
    (data) => (data.cost_base === '' || data.cost_base === null ? 'Base cost is required.' : null)
  ];

  function validateForm(data) {
    for (const validator of customValidators) {
      const err = validator(data);
      if (err) return err;
    }
    return null;
  }

let totalCost = $derived(
    (Number(form.cost_base) || 0) +
    (Number(form.cost_heat) || 0) +
    (Number(form.cost_water) || 0) +
    (Number(form.cost_power) || 0) +
    (Number(form.cost_internet) || 0) +
    (Number(form.cost_laundry) || 0) +
    (Number(form.cost_parking) || 0) +
    form.cost_other.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
  );

  $effect(() => {
    if (form.tour_date) {
      form.tour_requested = true;
    }
  });

onMount(() => {
    token = localStorage.getItem('casa_token') || '';
    isAuthenticated = !!token;
    fetchProperties();
  });

  async function handleLogin() {
    loginError = '';
    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity, password })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      token = data.token;
      isAuthenticated = true;
      localStorage.setItem('casa_token', token);
      showLoginModal = false;
      password = '';
      fetchProperties();
    } catch (err) {
      loginError = err.message;
    }
  }

  function handleLogout() {
    token = '';
    isAuthenticated = false;
    localStorage.removeItem('casa_token');
  }

  async function fetchProperties() {
    try {
      const headers = token ? { 'Authorization': token } : {};
      const res = await fetch(`${API_BASE}?sort=-created`, { headers });
      if (res.ok) {
        const data = await res.json();
        properties = data.items || [];
      }
    } catch (e) {
      console.error('Failed to fetch properties', e);
    }
  }

  function addCostOtherRow() {
    form.cost_other = [...form.cost_other, { name: '', amount: 0 }];
  }

  function removeCostOtherRow(index) {
    form.cost_other = form.cost_other.filter((_, i) => i !== index);
  }

  function parseCoordinates(rawStr) {
    if (!rawStr || typeof rawStr !== 'string') return null;
    const cleanStr = rawStr.replace(/\s+/g, '');
    const parts = cleanStr.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lon)) return { lat, lon };
    }
    return null;
  }

  async function handleSubmit() {
    const valError = validateForm(form);
    if (valError) {
      alert(valError);
      return;
    }

    const costOtherObj = {};
    form.cost_other.forEach(item => {
      if (item.name) costOtherObj[item.name] = Number(item.amount) || 0;
    });

    const payload = {
      address: form.address,
      url: form.url,
      contact: form.contact,
      coordinates: parseCoordinates(form.coordsRaw),
      laundry_type: form.laundry_type,
      move_in: form.move_in ? new Date(form.move_in).toISOString() : '',
      has_parking: form.has_parking,
      parking_nearby: form.parking_nearby,
      has_storage: form.has_storage,
      has_gym: form.has_gym,
      has_pool: form.has_pool,
      is_furnished: form.is_furnished,
      cost_base: Number(form.cost_base) || 0,
      cost_heat: Number(form.cost_heat) || 0,
      cost_water: Number(form.cost_water) || 0,
      cost_power: Number(form.cost_power) || 0,
      cost_internet: Number(form.cost_internet) || 0,
      cost_laundry: Number(form.cost_laundry) || 0,
      cost_parking: Number(form.cost_parking) || 0,
      cost_other: costOtherObj,
      status: 'QUEUED',
      verdict: 'UNDECIDED',
      tour_requested: !!form.tour_date || form.tour_requested,
      tour_date: form.tour_date ? new Date(form.tour_date).toISOString() : '',
      navigation_url: form.navigation_url,
      reviews: form.reviews,
      notes: form.notes
    };

    if (!isAuthenticated) {
      dryRunOutput = JSON.stringify(payload, null, 2);
      return;
    }

    const url = editingId ? `${API_BASE}/${editingId}` : API_BASE;
    const method = editingId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      resetForm();
      await fetchProperties();
      currentTab = 'list';
    } else {
      alert('Failed to save record.');
    }
  }

  function editProperty(p) {
    editingId = p.id;
    const coordsStr = p.coordinates ? `${p.coordinates.lat},${p.coordinates.lon}` : '';
    const costOtherArray = p.cost_other ? Object.entries(p.cost_other).map(([name, amount]) => ({ name, amount })) : [];

    form = {
      address: p.address || '',
      url: p.url || '',
      contact: p.contact || '',
      coordsRaw: coordsStr,
      laundry_type: p.laundry_type || 'in-unit',
      move_in: p.move_in ? p.move_in.slice(0, 10) : '',
      has_parking: !!p.has_parking,
      parking_nearby: !!p.parking_nearby,
      has_storage: !!p.has_storage,
      has_gym: !!p.has_gym,
      has_pool: !!p.has_pool,
      is_furnished: !!p.is_furnished,
      cost_base: p.cost_base || '',
      cost_heat: p.cost_heat ?? 80,
      cost_water: p.cost_water ?? 0,
      cost_power: p.cost_power ?? 80,
      cost_internet: p.cost_internet ?? 65,
      cost_laundry: p.cost_laundry ?? 35,
      cost_parking: p.cost_parking ?? 0,
      cost_other: costOtherArray,
      tour_requested: !!p.tour_requested,
      tour_date: p.tour_date ? new Date(p.tour_date).toISOString().slice(0, 16) : '',
      navigation_url: p.navigation_url || '',
      reviews: p.reviews || '',
      notes: p.notes || ''
    };
    currentTab = 'form';
  }

  async function deleteProperty(id) {
    if (!confirm('Are you sure you want to delete this property?')) return;
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': token }
    });
    if (res.ok) fetchProperties();
  }

  function resetForm() {
    editingId = null;
    form = {
      address: '', url: '', contact: '', coordsRaw: '', laundry_type: 'in-unit',
      move_in: '', has_parking: false, parking_nearby: false, has_storage: false,
      has_gym: false, has_pool: false, is_furnished: false, cost_base: '',
      cost_heat: 80, cost_water: 0, cost_power: 80, cost_internet: 65,
      cost_laundry: 35, cost_parking: 0, cost_other: [], tour_requested: false,
      tour_date: '', navigation_url: '', reviews: '', notes: ''
    };
  }

  function getTourCountdown(tourDateStr) {
    if (!tourDateStr) return null;
    const target = new Date(tourDateStr).getTime();
    if (isNaN(target)) return null;
    const diff = target - Date.now();
    if (diff <= 0) return 'Tour Passed';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);

    if (days > 0) return `Tour in ${days}d ${hours}h`;
    return `Tour in ${hours}h ${mins}m`;
  }

  function formatContact(contact) {
    if (!contact) return '';
    const emailMatch = contact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      return `<a href="mailto:${emailMatch[0]}" style="color:var(--accent);">${contact}</a>`;
    }
    const phoneMatch = contact.match(/(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    if (phoneMatch) {
      const cleanPhone = phoneMatch[0].replace(/\D/g, '');
      return `<a href="tel:${cleanPhone}" style="color:var(--accent);">${contact}</a>`;
    }
    return contact;
  }
</script>

<header class="header">
  <span class="header-logo">Casa</span>
  <div class="header-right">
    <button class="auth-badge {isAuthenticated ? 'authenticated' : ''}" on:click={() => showLoginModal = true}>
      <span class="auth-dot"></span>
      <span>{isAuthenticated ? identity : 'NOT AUTHENTICATED'}</span>
      {#if isAuthenticated}
        <span class="auth-signout" on:click|stopPropagation={handleLogout}>✕</span>
      {/if}
    </button>
  </div>
</header>

{#if showLoginModal}
  <div class="login-overlay open">
    <div class="login-backdrop" on:click={() => showLoginModal = false}></div>
    <div class="login-panel">
      <div class="login-panel-title">Sign in</div>
      <div class="field">
        <label class="field-label" for="identity">Identity</label>
        <input type="email" bind:value={identity} disabled />
      </div>
      <div class="field">
        <label class="field-label" for="password">Password</label>
        <input type="password" bind:value={password} placeholder="Password" />
      </div>
      {#if loginError}
        <div class="login-error" style="display:block">{loginError}</div>
      {/if}
      <div class="login-panel-actions">
        <button class="btn-secondary" type="button" on:click={() => showLoginModal = false}>Cancel</button>
        <button class="btn-submit" type="button" on:click={handleLogin}>Sign in</button>
      </div>
    </div>
  </div>
{/if}

<div class="view-tabs">
  <button class="view-tab {currentTab === 'form' ? 'active' : ''}" on:click={() => currentTab = 'form'}>
    {editingId ? 'Edit Entry' : '+ New entry'}
  </button>
  <button class="view-tab {currentTab === 'list' ? 'active' : ''}" on:click={() => currentTab = 'list'}>
    Saved <span class="tab-count mono">{properties.length}</span>
  </button>
</div>

<main class="main">
  {#if !isAuthenticated}
    <div class="connection-hint">→ Not connected — submit will dry run</div>
  {/if}

  {#if currentTab === 'form'}
    <div class="view-form active">
      {#if editingId}
        <div class="editing-banner visible">
          <span>Editing property: {form.address}</span>
          <span class="editing-banner-cancel" on:click={resetForm}>Cancel</span>
        </div>
      {/if}

      <section class="section">
        <div class="section-label">Identity</div>
        <div class="field" style="margin-bottom:12px;">
          <label class="field-label" for="address">Address <span class="req">*</span></label>
          <input type="text" id="address" bind:value={form.address} placeholder="123 Main St" />
        </div>
        <div class="grid-2" style="margin-bottom:12px;">
          <div class="field">
            <label class="field-label" for="cost_base">Base Monthly Cost ($) <span class="req">*</span></label>
            <input type="number" id="cost_base" bind:value={form.cost_base} placeholder="1500" />
          </div>
          <div class="field">
            <label class="field-label" for="contact">Contact</label>
            <input type="text" id="contact" bind:value={form.contact} placeholder="John (613) 555-0101" />
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="url">Listing URL</label>
          <input type="url" id="url" bind:value={form.url} placeholder="https://example.com/listing" />
        </div>
      </section>
      <div class="divider"></div>

      <section class="section">
        <div class="section-label">Location & Tour</div>
        <div class="grid-2" style="margin-bottom:12px;">
          <div class="field">
            <label class="field-label" for="coords">Coordinates (lat,long)</label>
            <input type="text" id="coords" bind:value={form.coordsRaw} placeholder="45.4215,-75.6972" />
          </div>
          <div class="field">
            <label class="field-label" for="nav_url">Navigation URL (map target)</label>
            <input type="text" id="nav_url" bind:value={form.navigation_url} placeholder="google.com/maps/..." />
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label class="field-label" for="tour_date">Tour Date & Time</label>
            <input type="datetime-local" id="tour_date" bind:value={form.tour_date} />
          </div>
          <div class="field" style="justify-content: flex-end;">
            <label class="field-label">
              <input type="checkbox" bind:checked={form.tour_requested} /> Tour Requested
            </label>
          </div>
        </div>
      </section>
      <div class="divider"></div>

      <section class="section">
        <div class="section-label">Unit Details</div>
        <div class="grid-2">
          <div class="field">
            <label class="field-label" for="laundry_type">Laundry Type</label>
            <select id="laundry_type" bind:value={form.laundry_type}>
              <option value="in-unit">In-unit</option>
              <option value="shared">Shared</option>
              <option value="coin-operated">Coin-operated</option>
              <option value="none">None</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="move_in">Move-in Date</label>
            <input type="date" id="move_in" bind:value={form.move_in} />
          </div>
        </div>
      </section>
      <div class="divider"></div>

      <section class="section">
        <div class="section-label">Amenities</div>
        <div class="chip-row">
          <button type="button" class="chip {form.has_parking ? 'active' : ''}" on:click={() => form.has_parking = !form.has_parking}>Parking</button>
          <button type="button" class="chip {form.parking_nearby ? 'active' : ''}" on:click={() => form.parking_nearby = !form.parking_nearby}>Parking Nearby</button>
          <button type="button" class="chip {form.has_storage ? 'active' : ''}" on:click={() => form.has_storage = !form.has_storage}>Storage</button>
          <button type="button" class="chip {form.has_gym ? 'active' : ''}" on:click={() => form.has_gym = !form.has_gym}>Gym</button>
          <button type="button" class="chip {form.has_pool ? 'active' : ''}" on:click={() => form.has_pool = !form.has_pool}>Pool</button>
          <button type="button" class="chip {form.is_furnished ? 'active' : ''}" on:click={() => form.is_furnished = !form.is_furnished}>Furnished</button>
        </div>
      </section>
      <div class="divider"></div>

      <section class="section">
        <div class="section-label">Additional Monthly Costs</div>
        <div class="grid-3">
          <div class="field"><label class="field-label" for="heat">Heat</label><input type="number" id="heat" bind:value={form.cost_heat} /></div>
          <div class="field"><label class="field-label" for="water">Water</label><input type="number" id="water" bind:value={form.cost_water} /></div>
          <div class="field"><label class="field-label" for="power">Power</label><input type="number" id="power" bind:value={form.cost_power} /></div>
          <div class="field"><label class="field-label" for="internet">Internet</label><input type="number" id="internet" bind:value={form.cost_internet} /></div>
          <div class="field"><label class="field-label" for="laundry">Laundry</label><input type="number" id="laundry" bind:value={form.cost_laundry} /></div>
          <div class="field"><label class="field-label" for="cost_parking">Parking</label><input type="number" id="cost_parking" bind:value={form.cost_parking} /></div>
        </div>

        {#each form.cost_other as item, index}
          <div class="cost-other-row" style="margin-top:8px;">
            <input type="text" placeholder="Expense name" bind:value={item.name} />
            <input type="number" placeholder="Cost" bind:value={item.amount} />
            <button type="button" class="btn-remove-other" on:click={() => removeCostOtherRow(index)}>✕</button>
          </div>
        {/each}
        <button type="button" class="btn-add-other" on:click={addCostOtherRow}>+ Add expense</button>

        <div class="cost-total-row">
          <span class="cost-total-label">Total Monthly Estimate</span>
          <span class="cost-total-value">${totalCost}</span>
        </div>
      </section>
      <div class="divider"></div>

      <section class="section">
        <div class="section-label">Notes & Reviews</div>
        <div class="field" style="margin-bottom:12px;">
          <label class="field-label" for="notes">Notes</label>
          <textarea id="notes" bind:value={form.notes} placeholder="Property notes..."></textarea>
        </div>
        <details>
          <summary class="field-label" style="cursor:pointer; padding: 4px 0;">Google Reviews (Click to expand)</summary>
          <textarea bind:value={form.reviews} placeholder="Google reviews summary..."></textarea>
        </details>
      </section>

      <button type="button" class="btn-submit {!isAuthenticated ? 'dry-run' : ''}" on:click={handleSubmit}>
        {isAuthenticated ? (editingId ? 'Update Listing' : 'Save Listing') : '⚠ Dry run — not authenticated'}
      </button>
    </div>
  {/if}

  {#if currentTab === 'list'}
    <div class="view-list active">
      <div class="list-toolbar">
        <span class="list-summary mono">{properties.length} Properties</span>
        <button class="btn-new-entry" on:click={() => { resetForm(); currentTab = 'form'; }}>+ New entry</button>
      </div>

      <div class="property-cards">
        {#each properties as p}
          <div class="property-card">
            <div class="property-card-header">
              <div>
                <div class="property-card-address">{p.address}</div>
                <div class="property-card-meta">
                  <span>Base: <strong>${p.cost_base}</strong></span>
                  {#if p.contact}
                    <span>Contact: {@html formatContact(p.contact)}</span>
                  {/if}
                </div>
              </div>
              {#if p.score}
                <div class="property-card-score">Score: {p.score}</div>
              {/if}
            </div>

            <div class="property-card-badges">
              {#if p.tour_date && getTourCountdown(p.tour_date)}
                <span class="property-card-badge" style="border-color:var(--amber); color:var(--amber);">
                  {getTourCountdown(p.tour_date)}
                </span>
              {/if}
              {#if p.distance_from_ref}
                <span class="property-card-badge">{p.distance_from_ref} km away</span>
              {/if}
              <span class="property-card-badge">{p.laundry_type}</span>
            </div>

            <div class="property-card-actions">
              {#if p.navigation_url}
                <a href="https://mapfwd.com/{p.navigation_url}" target="_blank" class="btn-card-action" style="text-align:center; text-decoration:none; background:var(--accent); color:#111318;">GO ➔</a>
              {/if}
              <button class="btn-card-action" on:click={() => expandedDetailsId = expandedDetailsId === p.id ? null : p.id}>
                {expandedDetailsId === p.id ? 'Hide Details' : 'View Details'}
              </button>
              <button class="btn-card-action btn-card-edit" on:click={() => editProperty(p)}>Edit</button>
              <button class="btn-card-action btn-card-delete" disabled={!isAuthenticated} on:click={() => deleteProperty(p.id)}>Delete</button>
            </div>

            {#if expandedDetailsId === p.id}
              <div class="property-details-inline" style="border-top:1px solid var(--border); padding-top:10px; margin-top:8px;">
                <div style="font-size:12px; margin-bottom:6px;"><strong>Move-in:</strong> {p.move_in ? p.move_in.slice(0, 10) : 'N/A'}</div>
                {#if p.notes}
                  <div style="font-size:12px; margin-bottom:6px;"><strong>Notes:</strong> {p.notes}</div>
                {/if}
                {#if p.reviews}
                  <details>
                    <summary style="font-size:11px; cursor:pointer; color:var(--accent);">Google Reviews</summary>
                    <p style="font-size:11px; color:var(--muted); margin-top:4px;">{p.reviews}</p>
                  </details>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</main>

{#if dryRunOutput}
  <div class="dry-run-panel open">
    <div class="dry-run-header">
      <span class="dry-run-title">⚠ Dry run — POST payload (not saved)</span>
      <button class="btn-close-dry-run" on:click={() => dryRunOutput = null}>✕</button>
    </div>
    <pre class="dry-run-pre">{dryRunOutput}</pre>
  </div>
{/if}
