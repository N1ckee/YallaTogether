const profilePage = document.getElementById("profilePage");
const myCarsLink = document.getElementById("my_cars_link");
const becomeDriverForm = document.getElementById("become_driver_form");
const driverStatusMessage = document.getElementById("driver_status_message");

async function loadCurrentUser() {
  const response = await fetch("/users/me");

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function setupProfile() {
  const user = await loadCurrentUser();

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  profilePage.style.display = "block";

  if (user.role === "driver") {
    myCarsLink.style.display = "inline";
    driverStatusMessage.style.display = "block";
    return;
  }

  becomeDriverForm.style.display = "block";
}

becomeDriverForm.addEventListener("submit", async function (e) {
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
      myCarsLink.style.display = "inline";
      driverStatusMessage.style.display = "block";
      becomeDriverForm.style.display = "none";
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

setupProfile();
