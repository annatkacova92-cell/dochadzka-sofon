(function () {
  const monthLabelEl = document.getElementById("monthLabelMine");
  const gridEl = document.getElementById("myTotalGrid");
  const bodyEl = document.getElementById("myEntriesBody");
  const form = document.getElementById("entryForm");
  const dateInput = document.getElementById("dateInput");
  const hoursInput = document.getElementById("hoursInput");
  const typeInput = document.getElementById("typeInput");
  const noteInput = document.getElementById("noteInput");
  const noteHint = document.getElementById("noteHint");
  const addBtn = document.getElementById("addBtn");
  const statusLine = document.getElementById("statusLine");

  let myEntries = [];

  function today() { return new Date(); }

  typeInput.addEventListener("change", () => {
    if (typeInput.value === "Iné") {
      noteInput.required = true;
      noteHint.textContent = "(popíš, o akú aktivitu išlo)";
    } else {
      noteInput.required = false;
      noteHint.textContent = "";
    }
  });

  async function loadMonth() {
    const { year, month } = APP.view.mine;
    renderMonthLabel(monthLabelEl, year, month);
    const { start, end } = monthBounds(year, month);

    const { data, error } = await supabaseClient
      .from("attendance")
      .select("id, date, hours, activity_type, note")
      .eq("user_id", APP.session.user.id)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false });

    if (error) {
      statusLine.textContent = "Nepodarilo sa načítať záznamy.";
      return;
    }
    myEntries = data || [];
    render();
  }

  function render() {
    const totalHours = myEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
    const pct = Math.min(totalHours / APP.monthlyCap, 1.3);
    const color = barColor(totalHours / APP.monthlyCap);
    gridEl.innerHTML = `
      <div class="person">
        <div class="person-name">${escapeHtml(APP.profile.name || APP.profile.email)}</div>
        <div class="person-hours">${formatHours(totalHours)} / ${APP.monthlyCap} h</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(pct*100,100)}%; background:${color};"></div></div>
      </div>`;

    if (myEntries.length === 0) {
      bodyEl.innerHTML = '<tr><td colspan="5" class="empty-note">Zatiaľ žiadne záznamy za tento mesiac.</td></tr>';
      return;
    }
    bodyEl.innerHTML = myEntries.map(e => `
      <tr>
        <td>${escapeHtml(e.date)}</td>
        <td>${formatHours(Number(e.hours))}</td>
        <td>${escapeHtml(e.activity_type)}</td>
        <td>${escapeHtml(e.note)}</td>
        <td><button class="del-btn" data-id="${e.id}" title="Vymazať">✕</button></td>
      </tr>`).join("");
  }

  bodyEl.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".del-btn");
    if (!btn) return;
    btn.disabled = true;
    const { error } = await supabaseClient.from("attendance").delete().eq("id", btn.dataset.id);
    if (error) {
      statusLine.textContent = "Vymazanie zlyhalo.";
      btn.disabled = false;
      return;
    }
    await loadMonth();
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    statusLine.textContent = "";

    const date = dateInput.value;
    const hours = parseFloat(hoursInput.value);
    const activity_type = typeInput.value;
    const note = noteInput.value.trim();

    if (!date || !hours || hours <= 0 || !activity_type) {
      statusLine.textContent = "Vyplň dátum, hodiny a typ aktivity.";
      return;
    }
    if (activity_type === "Iné" && !note) {
      statusLine.textContent = "Pri type 'Iné' prosím napíš poznámku, o akú aktivitu išlo.";
      return;
    }

    addBtn.disabled = true;
    statusLine.textContent = "Ukladám...";
    const { error } = await supabaseClient.from("attendance").insert({
      user_id: APP.session.user.id,
      date, hours, activity_type, note: note || null,
    });
    addBtn.disabled = false;

    if (error) {
      statusLine.textContent = "Uloženie zlyhalo, skús to znova.";
      return;
    }
    hoursInput.value = "";
    noteInput.value = "";
    typeInput.value = "";
    noteInput.required = false;
    noteHint.textContent = "";
    statusLine.textContent = "Uložené.";
    setTimeout(() => { statusLine.textContent = ""; }, 2000);

    // ak pridaný záznam patrí do aktuálne zobrazeného mesiaca, obnov zoznam
    if (date.slice(0, 7) === monthKey(APP.view.mine.year, APP.view.mine.month)) {
      await loadMonth();
    }
  });

  document.getElementById("prevMonthMine").addEventListener("click", () => {
    APP.view.mine.month -= 1;
    if (APP.view.mine.month < 0) { APP.view.mine.month = 11; APP.view.mine.year -= 1; }
    loadMonth();
  });
  document.getElementById("nextMonthMine").addEventListener("click", () => {
    APP.view.mine.month += 1;
    if (APP.view.mine.month > 11) { APP.view.mine.month = 0; APP.view.mine.year += 1; }
    loadMonth();
  });

  window.initMemberView = function () {
    dateInput.value = isoDate(today());
    loadMonth();
  };
})();
