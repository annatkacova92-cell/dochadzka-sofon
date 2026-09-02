(function () {
  let mode = "login"; // or "signup"

  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const nameField = document.getElementById("nameField");
  const nameInput = document.getElementById("nameInput");
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const submitBtn = document.getElementById("submitBtn");
  const errorMsg = document.getElementById("errorMsg");
  const statusMsg = document.getElementById("statusMsg");
  const form = document.getElementById("authForm");

  function setMode(newMode) {
    mode = newMode;
    const isSignup = mode === "signup";
    tabLogin.classList.toggle("active", !isSignup);
    tabSignup.classList.toggle("active", isSignup);
    nameField.hidden = !isSignup;
    nameInput.required = isSignup;
    submitBtn.textContent = isSignup ? "Zaregistrovať sa" : "Prihlásiť sa";
    errorMsg.textContent = "";
    statusMsg.textContent = "";
  }

  tabLogin.addEventListener("click", () => setMode("login"));
  tabSignup.addEventListener("click", () => setMode("signup"));

  async function redirectIfLoggedIn() {
    const { data } = await supabaseClient.auth.getSession();
    if (data && data.session) {
      window.location.href = "app.html";
    }
  }
  redirectIfLoggedIn();

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    errorMsg.textContent = "";
    statusMsg.textContent = "";
    submitBtn.disabled = true;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      if (mode === "signup") {
        const name = nameInput.value.trim();
        if (!name) {
          errorMsg.textContent = "Zadaj svoje meno.";
          submitBtn.disabled = false;
          return;
        }
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        if (data.session) {
          window.location.href = "app.html";
        } else {
          statusMsg.textContent = "Účet vytvorený. Skontroluj e-mail a potvrď registráciu, potom sa prihlás.";
          setMode("login");
        }
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "app.html";
      }
    } catch (err) {
      errorMsg.textContent = translateError(err.message || String(err));
    } finally {
      submitBtn.disabled = false;
    }
  });

  function translateError(msg) {
    if (/invalid login credentials/i.test(msg)) return "Nesprávny e-mail alebo heslo.";
    if (/user already registered/i.test(msg)) return "Tento e-mail je už zaregistrovaný — skús sa prihlásiť.";
    if (/password should be at least/i.test(msg)) return "Heslo musí mať aspoň 6 znakov.";
    return msg;
  }
})();
