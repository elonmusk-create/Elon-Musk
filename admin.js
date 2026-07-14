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
      // Even on read error, ensure at least one option is selected so a button shows
      telegramInput.value = window.APP_CONFIG.TELEGRAM_USERNAME || "";
      whatsappInput.value = "";
      showTelegram.checked = true;
      showWhatsapp.checked = false;
      return;
    }
    const row = data?.[0];
    if (!row) {
      // No stored settings: prefer showing Telegram by default
      telegramInput.value = window.APP_CONFIG.TELEGRAM_USERNAME || "";
      whatsappInput.value = "";
      showTelegram.checked = true;
      showWhatsapp.checked = false;
      return;
    }

    // Populate inputs from DB but ensure at least one contact option is enabled
    telegramInput.value = row.telegram_username || window.APP_CONFIG.TELEGRAM_USERNAME || "";
    whatsappInput.value = row.whatsapp_number || "";
    // coerce to boolean
    const tg = !!row.show_telegram;
    const wa = !!row.show_whatsapp;

    if (!tg && !wa) {
      // don't use old data if it would leave both unchecked — force Telegram on
      showTelegram.checked = true;
      showWhatsapp.checked = false;
    } else {
      showTelegram.checked = tg;
      showWhatsapp.checked = wa;
    }
  }

  btnSave.addEventListener("click", async () => {
    saveStatus.textContent = "Saving...";

    // enforce at least one selected
    if (!showTelegram.checked && !showWhatsapp.checked) {
      // default to Telegram if admin accidentally unchecks both
      showTelegram.checked = true;
    }

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

    try {
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

      // reload so inputs reflect canonical stored state
      await loadSettings();
      saveStatus.textContent = "Saved";
      setTimeout(() => (saveStatus.textContent = ""), 2500);
    } catch (err) {
      console.error(err);
      saveStatus.textContent = "Save failed: " + (err.message || JSON.stringify(err));
    }
  });

  // initial load
  loadSettings();
})();
