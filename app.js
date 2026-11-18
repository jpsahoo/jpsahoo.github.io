document.addEventListener("DOMContentLoaded", () => {
  fetch("config.json")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to load configuration");
      }
      return response.json();
    })
    .then(data => {
      if (data.targetUrl) {
        document.getElementById("content-frame").src = data.targetUrl;
      }
    })
    .catch(error => console.error("Error loading target:", error));
});
