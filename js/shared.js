// Shared state & helpers used by member.js and admin.js
const APP = {
  session: null,
  profile: null, // { id, email, name, role }
  monthlyCap: 30,
  view: {
    mine: { year: null, month: null },
    admin: { year: null, month: null },
  },
};

const MONTH_NAMES = ["január","február","marec","apríl","máj","jún","júl","august","september","október","november","december"];

function pad(n) { return String(n).padStart(2, "0"); }
function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function monthKey(y, m) { return y + "-" + pad(m + 1); }
function monthBounds(y, m) {
  const start = `${y}-${pad(m + 1)}-01`;
  const endDate = new Date(y, m + 1, 1);
  const end = isoDate(endDate); // exclusive
  return { start, end };
}
function formatHours(h) {
  return (Math.round(h * 100) / 100).toString().replace(".", ",");
}
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function barColor(pct) {
  if (pct > 1) return "var(--bad)";
  if (pct >= 0.8) return "var(--warn)";
  return "var(--ok)";
}
function renderMonthLabel(el, y, m) {
  el.textContent = MONTH_NAMES[m] + " " + y;
}

async function requireSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data || !data.session) {
    window.location.href = "index.html";
    return null;
  }
  return data.session;
}

async function loadOwnProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, email, name, role")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("Nepodarilo sa načítať profil:", error.message);
    return null;
  }
  return data;
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

async function initShell() {
  const session = await requireSession();
  if (!session) return;
  APP.session = session;

  const profile = await loadOwnProfile(session.user.id);
  APP.profile = profile;

  document.getElementById("whoName").textContent = (profile && profile.name) || session.user.email;

  const today = new Date();
  APP.view.mine.year = today.getFullYear();
  APP.view.mine.month = today.getMonth();
  APP.view.admin.year = today.getFullYear();
  APP.view.admin.month = today.getMonth();

  if (profile && profile.role === "admin") {
    document.getElementById("tabs").hidden = false;
    const tabMine = document.getElementById("tabMine");
    const tabAdmin = document.getElementById("tabAdmin");
    const mineView = document.getElementById("mineView");
    const adminView = document.getElementById("adminView");

    tabMine.addEventListener("click", () => {
      tabMine.classList.add("active");
      tabAdmin.classList.remove("active");
      mineView.hidden = false;
      adminView.hidden = true;
    });
    tabAdmin.addEventListener("click", () => {
      tabAdmin.classList.add("active");
      tabMine.classList.remove("active");
      mineView.hidden = true;
      adminView.hidden = false;
      if (window.refreshAdminView) window.refreshAdminView();
    });
  }

  if (window.initMemberView) window.initMemberView();
}

initShell();
