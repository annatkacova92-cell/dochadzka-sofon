(function () {
  const monthLabelEl = document.getElementById("monthLabelAdmin");
  const teamGridEl = document.getElementById("teamGrid");
  const teamBodyEl = document.getElementById("teamEntriesBody");
  const personFilter = document.getElementById("personFilter");

  let profilesById = {};
  let teamEntries = [];
  let loadedOnce = false;

  async function loadProfiles() {
    const { data, error } = await supabaseClient.from("profiles").select("id, name, email");
    if (error) { console.error(error.message); return; }
    profilesById = {};
    (data || []).forEach(p => { profilesById[p.id] = p.name || p.email; });

    const names = Object.entries(profilesById).sort((a, b) => a[1].localeCompare(b[1]));
    personFilter.innerHTML = '<option value="">Všetci</option>' +
      names.map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join("");
  }

  async function loadMonth() {
    const { year, month } = APP.view.admin;
    renderMonthLabel(monthLabelEl, year, month);
    const { start, end } = monthBounds(year, month);

    const { data, error } = await supabaseClient
      .from("attendance")
      .select("id, user_id, date, hours, activity_type, note")
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false });

    if (error) {
      teamBodyEl.innerHTML = `<tr><td colspan="5" class="empty-note">Nepodarilo sa načítať dáta.</td></tr>`;
      return;
    }
    teamEntries = data || [];
    render();
  }

  function render() {
    // per-person totals for the month
    const totals = {};
    teamEntries.forEach(e => {
      totals[e.user_id] = (totals[e.user_id] || 0) + Number(e.hours || 0);
    });
    const allIds = Array.from(new Set([...Object.keys(profilesById), ...Object.keys(totals)]));
    const sortedIds = allIds.sort((a, b) => (profilesById[a] || "").localeCompare(profilesById[b] || ""));

    if (sortedIds.length === 0) {
      teamGridEl.innerHTML = '<div class="empty-note">Zatiaľ žiadne záznamy.</div>';
    } else {
      teamGridEl.innerHTML = sortedIds.map(id => {
        const hrs = totals[id] || 0;
        const pct = Math.min(hrs / APP.monthlyCap, 1.3);
        const color = barColor(hrs / APP.monthlyCap);
        const name = profilesById[id] || "(neznámy)";
        return `
          <div class="person">
            <div class="person-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
            <div class="person-hours">${formatHours(hrs)} / ${APP.monthlyCap} h</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.min(pct*100,100)}%; background:${color};"></div></div>
          </div>`;
      }).join("");
    }

    const filterId = personFilter.value;
    const filtered = filterId ? teamEntries.filter(e => e.user_id === filterId) : teamEntries;
    const sorted = filtered.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (profilesById[a.user_id] || "").localeCompare(profilesById[b.user_id] || "");
    });

    if (sorted.length === 0) {
      teamBodyEl.innerHTML = '<tr><td colspan="5" class="empty-note">Žiadne záznamy za tento mesiac.</td></tr>';
      return;
    }
    teamBodyEl.innerHTML = sorted.map(e => `
      <tr>
        <td>${escapeHtml(e.date)}</td>
        <td>${escapeHtml(profilesById[e.user_id] || "(neznámy)")}</td>
        <td>${formatHours(Number(e.hours))}</td>
        <td>${escapeHtml(e.activity_type)}</td>
        <td>${escapeHtml(e.note)}</td>
      </tr>`).join("");
  }

  personFilter.addEventListener("change", render);

  document.getElementById("prevMonthAdmin").addEventListener("click", () => {
    APP.view.admin.month -= 1;
    if (APP.view.admin.month < 0) { APP.view.admin.month = 11; APP.view.admin.year -= 1; }
    loadMonth();
  });
  document.getElementById("nextMonthAdmin").addEventListener("click", () => {
    APP.view.admin.month += 1;
    if (APP.view.admin.month > 11) { APP.view.admin.month = 0; APP.view.admin.year += 1; }
    loadMonth();
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    const { year, month } = APP.view.admin;

    // Presne to isté, čo je zobrazené v tabuľke (rešpektuje aj aktuálny filter osoby)
    const filterId = personFilter.value;
    const filtered = filterId ? teamEntries.filter(e => e.user_id === filterId) : teamEntries;
    const sorted = filtered.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (profilesById[a.user_id] || "").localeCompare(profilesById[b.user_id] || "");
    });

    const entryRows = sorted.map(e => ({
      "Dátum": e.date,
      "Meno": profilesById[e.user_id] || "(neznámy)",
      "Hodiny": Number(e.hours),
      "Typ aktivity": e.activity_type,
      "Poznámka": e.note || "",
    }));

    const ws = XLSX.utils.json_to_sheet(entryRows);

    // Súhrn hodín na konci
    const totals = {};
    sorted.forEach(e => {
      totals[e.user_id] = (totals[e.user_id] || 0) + Number(e.hours || 0);
    });
    const totalIds = Object.keys(totals).sort((a, b) => (profilesById[a] || "").localeCompare(profilesById[b] || ""));
    const grandTotal = Object.values(totals).reduce((sum, h) => sum + h, 0);

    const summaryAoa = [
      [],
      ["Súhrn hodín"],
      ...totalIds.map(id => [profilesById[id] || "(neznámy)", Number(totals[id].toFixed(2))]),
      [],
      ["Spolu", Number(grandTotal.toFixed(2))],
    ];
    XLSX.utils.sheet_add_aoa(ws, summaryAoa, { origin: -1 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dochádzka");

    const fileName = `Dochadzka_Sofon_${year}-${String(month + 1).padStart(2, "0")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  });

  window.refreshAdminView = async function () {
    if (!loadedOnce) {
      await loadProfiles();
      loadedOnce = true;
    }
    await loadMonth();
  };
})();
