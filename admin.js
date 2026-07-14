(async () => {
  const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert("Supabase config missing in config.js");
    return;
  }

  // Use the UMD global `supabase` (not supabaseJs)
  const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Elements
  const telegramInput = document.getElementById("telegram-username");
  const whatsappInput = document.getElementById("whatsapp-number");
  const showTelegram = document.getElementById("show-telegram");
  const showWhatsapp = document.getElementById("show-whatsapp");
  const btnSave = document.getElementById("btn-save");
  const saveStatus = document.getElementById("save-status");

  async function loadSettings() {
    saveStatus.textContent = "";
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error(error);
      saveStatus.textContent = "Failed to load settings: " + (error.message || error);
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
      saveStatus.textContent = "Error reading settings: " + (error.message || error);
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

    // Optionally notify the page or caller that settings changed. We can't update index.html automatically across clients.
  });

  // initial load
  loadSettings();
})();
