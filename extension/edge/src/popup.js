(function () {
  const HEALTH_ENDPOINT = "http://127.0.0.1:3987/api/health";
  const statusText = document.getElementById("status-text");
  const statusDot = document.getElementById("status-dot");
  const refreshButton = document.getElementById("refresh-button");

  function renderStatus(isOnline) {
    statusText.textContent = isOnline
      ? "Local capture service online"
      : "Local capture service offline";
    statusDot.dataset.state = isOnline ? "online" : "offline";
  }

  async function checkHealth() {
    statusText.textContent = "Checking service...";
    statusDot.dataset.state = "checking";

    try {
      const response = await fetch(HEALTH_ENDPOINT);
      renderStatus(response.ok);
    } catch {
      renderStatus(false);
    }
  }

  refreshButton.addEventListener("click", () => {
    void checkHealth();
  });

  void checkHealth();
})();
