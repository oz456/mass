const API_BASE = "https://massbunkapi-production.up.railway.app";

/* Force uppercase + alphanumeric */
function forceUppercase(el) {
  el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/* Start marking */
async function startMarking() {
  const code = document.getElementById("codeInput").value.trim();
  const status = document.getElementById("statusText");
  const results = document.getElementById("resultsList");
  const markButton = document.querySelector(".mark-btn");
  
  // Disable button during processing
  markButton.disabled = true;
  markButton.style.opacity = "0.7";
  markButton.style.cursor = "not-allowed";

  if (!code) {
    status.textContent = "Enter attendance code.";
    return;
  }

  status.textContent = "Shinchan is marking attendance...";
  results.innerHTML = "";

  try {
    const response = await fetch(`${API_BASE}/mark?code=${code}`, {
      method: "POST"
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.trim().split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const obj = JSON.parse(line);
          appendResult(obj);
        } catch (err) {
          console.log("Non-JSON chunk ignored:", line);
        }
      }
    }

    status.textContent = "All done!";
  } catch (err) {
    console.error(err);
    status.textContent = "Error reaching backend.";
  } finally {
    // Re-enable button when done or on error
    markButton.disabled = false;
    markButton.style.opacity = "1";
    markButton.style.cursor = "pointer";
  }
}

/* Add result to UI */
function appendResult(obj) {
  const results = document.getElementById("resultsList");

  const item = document.createElement("div");
  item.className = "result-item";

  const badgeClass =
    obj.status === "ATTENDANCE_MARKED" ? "badge-success" :
    obj.status === "ATTENDANCE_ALREADY_MARKED" ? "badge-warn" :
    "badge-error";

  item.innerHTML = `
    <span class="result-name">${obj.name}</span>
    <span class="result-badge ${badgeClass}">${obj.status}</span>
  `;

  results.appendChild(item);
}
