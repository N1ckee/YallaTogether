document.getElementById("become_driver_form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const errorMessage = document.getElementById("driver_error_message");
  const successMessage = document.getElementById("driver_success_message");
  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  errorMessage.style.display = "none";
  successMessage.style.display = "none";

  try {
    const response = await fetch("/users/become-driver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      successMessage.textContent = result.message || "Driver registration successful.";
      successMessage.style.display = "block";
      this.reset();
      return;
    }

    errorMessage.textContent = result.error || "Could not register as driver.";
    errorMessage.style.display = "block";
  } catch (err) {
    errorMessage.textContent = "Network error";
    errorMessage.style.display = "block";
  }
});
