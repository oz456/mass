const API_BASE = "https://massbunkapi-production.up.railway.app";

/* Format and validate input as user types (1 letter + 6 digits) */
function forceUppercase(el) {
  // Get current cursor position
  const start = el.selectionStart;
  const end = el.selectionEnd;
  
  // Remove any non-alphanumeric characters and convert to uppercase
  let newValue = el.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // If first character is a number, remove it
  if (/^\d/.test(newValue)) {
    newValue = newValue.substring(1);
  }
  
  // If more than 7 characters, truncate to 7
  if (newValue.length > 7) {
    newValue = newValue.substring(0, 7);
  }
  
  // If more than 1 character, ensure remaining are digits
  if (newValue.length > 1) {
    const firstChar = newValue[0];
    const remaining = newValue.substring(1).replace(/\D/g, '');
    newValue = firstChar + remaining.substring(0, 6); // Max 6 digits after first char
  }
  
  // Update the input value
  el.value = newValue;
  
  // Adjust cursor position if we modified the value
  const diff = newValue.length - (el.value.length - (end - start));
  const newStart = Math.max(0, start + diff);
  const newEnd = Math.max(0, end + diff);
  
  // Restore cursor position
  el.setSelectionRange(newStart, newEnd);
  
  // Validate input format and update button state
  validateInput(el);
}

/* Validate input format (1 letter + 6 digits) */
function validateInput(inputElement) {
  const markButton = document.querySelector(".mark-btn");
  const inputValue = inputElement.value;
  
  // Check if input matches the required format: 1 letter + 6 digits
  const isValid = /^[A-Z]\d{6}$/.test(inputValue);
  
  // Update button state based on validation
  markButton.disabled = !isValid;
  markButton.style.opacity = isValid ? "1" : "0.7";
  markButton.style.cursor = isValid ? "pointer" : "not-allowed";
  
  return isValid;
}

/* Initialize button state on page load */
window.onload = function() {
  const codeInput = document.getElementById("codeInput");
  const markButton = document.querySelector(".mark-btn");
  
  // Initial button state
  markButton.disabled = true;
  markButton.style.opacity = "0.7";
  markButton.style.cursor = "not-allowed";
  
  // Add input event listener for real-time validation
  codeInput.addEventListener('input', function() {
    forceUppercase(this);
  });
};

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
  
  // Additional validation (should already be validated by the input handler)
  if (!/^[A-Z]\d{6}$/.test(code)) {
    status.textContent = "Invalid code format. Use 1 letter followed by 6 digits.";
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
