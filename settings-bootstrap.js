// Settings bootstrap: fetch from Supabase and update claim buttons (with polling)
(async () => {
  const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    async function fetchAndApply() {
      try {
        const { data } = await supabase
          .from("settings")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1);

        const remote = data?.[0] || null;

        const TELEGRAM_USERNAME = (remote?.telegram_username?.trim())
          || window.APP_CONFIG?.TELEGRAM_USERNAME?.trim()
          || ""; // allow empty

        const SHOW_TELEGRAM = remote?.show_telegram ?? true;
        const SHOW_WHATSAPP = remote?.show_whatsapp ?? false;
        const WHATSAPP_NUMBER = remote?.whatsapp_number?.trim() || "";

        // update modal telegram button: show based on flag only
        const tgBtn = document.getElementById("modal-claim-tg");
        if (tgBtn) {
          if (SHOW_TELEGRAM) {
            // show the button even if username is empty
            tgBtn.hidden = false;
            if (TELEGRAM_USERNAME) {
              tgBtn.href = `https://t.me/${TELEGRAM_USERNAME.replace(/^@/, "")}`;
              tgBtn.classList.remove('btn-claim--empty');
            } else {
              // no username yet — show visually but disable clicking
              tgBtn.href = "#";
              tgBtn.classList.add('btn-claim--empty');
            }
          } else {
            tgBtn.hidden = true;
          }
        }

        // update whatsapp button: show based on flag only
        const waBtn = document.getElementById("modal-claim-wa");
        if (waBtn) {
          if (SHOW_WHATSAPP) {
            waBtn.hidden = false;
            if (WHATSAPP_NUMBER) {
              waBtn.href = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}`;
              waBtn.classList.remove('btn-claim--empty');
            } else {
              waBtn.href = "#";
              waBtn.classList.add('btn-claim--empty');
            }
          } else {
            waBtn.hidden = true;
          }
        }
      } catch (err) {
        console.warn("Failed to load remote settings (poll):", err);
      }
    }

    // initial apply
    await fetchAndApply();
    // poll every 15 seconds for updates so public page updates without reload
    setInterval(fetchAndApply, 15000);
  } catch (err) {
    console.warn("Failed to initialize settings bootstrap:", err);
  }
})();
