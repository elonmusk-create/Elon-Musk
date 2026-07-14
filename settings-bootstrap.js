// Settings bootstrap: fetch from Supabase and update claim buttons
(async () => {
  const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await supabase
      .from("settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);

    const remote = data?.[0] || null;

    const TELEGRAM_USERNAME = (remote?.telegram_username?.trim())
      || window.APP_CONFIG?.TELEGRAM_USERNAME?.trim()
      || "@kated356";

    const SHOW_TELEGRAM = remote?.show_telegram ?? true;
    const SHOW_WHATSAPP = remote?.show_whatsapp ?? false;
    const WHATSAPP_NUMBER = remote?.whatsapp_number?.trim() || "";

    // update modal telegram button
    const tgBtn = document.getElementById("modal-claim-tg");
    if (tgBtn) {
      if (SHOW_TELEGRAM && TELEGRAM_USERNAME) {
        tgBtn.href = `https://t.me/${TELEGRAM_USERNAME.replace(/^@/, "")}`;
        tgBtn.hidden = false;
      } else {
        tgBtn.hidden = true;
      }
    }

    // update whatsapp button
    const waBtn = document.getElementById("modal-claim-wa");
    if (waBtn) {
      if (SHOW_WHATSAPP && WHATSAPP_NUMBER) {
        waBtn.href = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}`;
        waBtn.hidden = false;
      } else {
        waBtn.hidden = true;
      }
    }
  } catch (err) {
    console.warn("Failed to load remote settings:", err);
  }
})();
