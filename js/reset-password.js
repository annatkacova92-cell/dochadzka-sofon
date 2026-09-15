(function () {
  const form = document.getElementById("resetForm");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const submitBtn = document.getElementById("submitBtn");
  const errorMsg = document.getElementById("errorMsg");
  const statusMsg = document.getElementById("statusMsg");

  let linkLooksValid = true;
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") linkLooksValid = true;
  });

  setTimeout(async () => {
    const { data } = await supabaseClient.auth.getSession();
    if (!data || !data.session) {
      linkLooksValid = false;
      statusMsg.textContent = "";
      errorMsg.textContent = "Tento odkaz na obnovenie hesla je neplatný alebo už vypršal. Vráť sa na prihlásenie a vyžiadaj si nový.";
    }
  }, 800);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    errorMsg.textContent = "";
    statusMsg.textContent = "";

    const pw = newPasswordInput.value;
    const pw2 = confirmPasswordInput.value;

    if (pw.length < 6) {
      errorMsg.textContent = "Heslo musí mať aspoň 6 znakov.";
      return;
    }
    if (pw !== pw2) {
      errorMsg.textContent = "Heslá sa nezhodujú.";
      return;
    }

    submitBtn.disabled = true;
    const { error } = await supabaseClient.auth.updateUser({ password: pw });
    submitBtn.disabled = false;

    if (error) {
      errorMsg.textContent = translateError(error.message || String(error));
      return;
    }

    statusMsg.textContent = "Heslo bolo zmenené. Presmerúvam na prihlásenie...";
    form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  });

  function translateError(msg) {
    if (/password should be at least/i.test(msg)) return "Heslo musí mať aspoň 6 znakov.";
    if (/auth session missing|invalid|expired|jwt/i.test(msg)) {
      return "Odkaz na obnovenie hesla je neplatný alebo vypršal. Vráť sa na prihlásenie a vyžiadaj si nový.";
    }
    return msg;
  }
})();
