document.addEventListener("DOMContentLoaded", () => {
  const frame = document.getElementById("content-frame");
  const notice = document.getElementById("notice");

  const showNotice = (html) => {
    notice.innerHTML = html;
    notice.classList.remove("d-none");
  };

  fetch("config.json", { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error("Failed to load configuration");
      return response.json();
    })
    .then(data => {
      const url = (data.targetUrl || "").trim();
      let host = "";
      try { host = new URL(url).hostname; } catch (_) {}

      // Guard against placeholders / bare domains that redirect to cloudflare.com
      if (!host || host === "pages.dev" || host.startsWith("your-project")) {
        showNotice('Set <code>targetUrl</code> in <code>config.json</code> to your full site address, e.g. <code>https://my-site.pages.dev</code>.');
        return;
      }

      if (data.embed === false) {
        window.location.replace(url);   // full redirect, never blocked
        return;
      }

      frame.src = url;
      notice.innerHTML = 'Page not showing? <a href="' + url + '" target="_top">Open it directly</a>';
    })
    .catch(error => {
      console.error("Error loading target:", error);
      showNotice("Could not load <code>config.json</code>. Serve the site over HTTP (e.g. GitHub Pages), not as a local file.");
    });
});
