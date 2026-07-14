(async () => {
  const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert("Supabase config missing in config.js");
    return;
  }

  const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Elements
  const emailInput = document.getElementById("email");
  const btnSignin = document.getElementById("btn-signin");
  const btnLogout = document.getElementById("btn-logout");
  const signedIn = document.getElementById("signed-in");
  const signedOut = document.getElementById("signed-out");
  const userEmailEl = document.getElementById("user-email");
  const settingsForm = document.getElementById("settings-form");
  const telegramInput = document.getElementById("telegram-username");
  const whatsappInput = document.getElementById("whatsapp-number");
  const showTelegram = document.getElementById("show-telegram");
  const showWhatsapp = document.getElementById("show-whatsapp");
  const btnSave = document.getElementById("btn-save");
  const saveStatus = document.getElementById("save-status");

  function showSignedOut() {
    signedOut.hidden = false;
    signedIn.hidden = true;
    settingsForm.hidden = true;
  }
  function showSignedIn(email) {
    signedOut.hidden = true;
    signedIn.hidden = false;
    userEmailEl.textContent = email;
    settingsForm.hidden = false;
  }

  // Auth state
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      showSignedIn(session.user.email || session.user.id);
      loadSettings();
    } else {
      showSignedOut();
    }
  });

  // initial
  const user = supabase.auth.user();
  if (user) showSignedIn(user.email || user.id);
  else showSignedOut();

  // Sign in via magic link
  btnSignin.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    if (!email) return alert("Enter your email");
    const { error } = await supabase.auth.signIn({ email });
    if (error) alert("Error sending magic link: " + error.message);
    else alert("Magic link sent — check your email");
  });

  btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    showSignedOut();
  });

  // Load the singleton settings row (assumes one row)
  async function loadSettings() {
    saveStatus.textContent = "";
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error(error);
      saveStatus.textContent = "Failed to load settings";
      return;
    }
    const row = data?.[0];
    if (!row) {
      telegramInput.value = window.APP_CONFIG.TELEGRAM_USERNAME || "";
      whatsappInput.value = "";
      showTelegram.checked = true;
      showWhatsapp.checked = false;
      return;
    }
    telegramInput.value = row.telegram_username || "";
    whatsappInput.value = row.whatsapp_number || "";
    showTelegram.checked = !!row.show_telegram;
    showWhatsapp.checked = !!row.show_whatsapp;
  }

  btnSave.addEventListener("click", async () => {
    saveStatus.textContent = "Saving...";
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      saveStatus.textContent = "Error reading settings";
      return;
    }

    const payload = {
      telegram_username: telegramInput.value.trim(),
      whatsapp_number: whatsappInput.value.trim(),
      show_telegram: showTelegram.checked,
      show_whatsapp: showWhatsapp.checked,
      updated_at: new Date().toISOString()
    };

    if (data && data.length > 0) {
      const id = data[0].id;
      const { error: updateErr } = await supabase
        .from("settings")
        .update(payload)
        .eq("id", id);
      if (updateErr) {
        saveStatus.textContent = "Update failed: " + updateErr.message;
        return;
      }
      saveStatus.textContent = "Saved";
    } else {
      const { error: insertErr } = await supabase
        .from("settings")
        .insert(payload);
      if (insertErr) {
        saveStatus.textContent = "Insert failed: " + insertErr.message;
        return;
      }
      saveStatus.textContent = "Saved";
    }
  });
})();
