(async () => {
  const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert("Supabase config missing in config.js");
    return;
  }

  // Use the UMD global `supabase`
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const telegramInput = document.getElementById("telegram-username");
  const btnSave = document.getElementById("btn-save");
  const saveStatus = document.getElementById("save-status");

  async function loadSettings() {
    saveStatus.textContent = "";
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error(error);
        saveStatus.textContent = "Failed to load settings: " + (error.message || error);
        // populate from config as fallback
        telegramInput.value = window.APP_CONFIG?.TELEGRAM_USERNAME || "";
        return;
      }

      const row = data?.[0];
      if (!row) {
        telegramInput.value = window.APP_CONFIG?.TELEGRAM_USERNAME || "";
        return;
      }

      telegramInput.value = row.telegram_username || window.APP_CONFIG?.TELEGRAM_USERNAME || "";
    } catch (err) {
      console.error(err);
      saveStatus.textContent = "Failed to load settings: " + (err.message || err);
      telegramInput.value = window.APP_CONFIG?.TELEGRAM_USERNAME || "";
    }
  }

  btnSave.addEventListener("click", async () => {
    saveStatus.textContent = "Saving...";

    // Normalize the Telegram username (ensure trimmed and with @ optional)
    let username = telegramInput.value.trim();
    if (username && !username.startsWith("@")) username = "@" + username;

    const payload = {
      telegram_username: username,
      // Always ensure Telegram is shown
      show_telegram: true,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const id = data[0].id;
        const { error: updateErr } = await supabase
          .from("settings")
          .update(payload)
          .eq("id", id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("settings")
          .insert(payload);
        if (insertErr) throw insertErr;
      }

      // reload canonical values
      await loadSettings();
      saveStatus.textContent = "Saved";
      setTimeout(() => (saveStatus.textContent = ""), 2000);
    } catch (err) {
      console.error(err);
      saveStatus.textContent = "Save failed: " + (err.message || JSON.stringify(err));
    }
  });

  // initial load
  loadSettings();
})();
