const usernameElement = document.getElementById("username");
const ratingElement = document.getElementById("rating");
const createRideSection = document.getElementById("create_ride_section");
const createRideForm = document.getElementById("create_ride_form");
const carSelect = document.getElementById("car_id");
const rideErrorMessage = document.getElementById("ride_error_message");
const rideSuccessMessage = document.getElementById("ride_success_message");

async function loadCurrentUser() {
  const response = await fetch("/users/me");

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function loadDriverCars() {
  const response = await fetch("/cars/get");

  if (!response.ok) {
    return [];
  }

  return response.json();
}

function showMessage(element, message) {
  element.textContent = message;
  element.style.display = "block";
}

function hideRideMessages() {
  rideErrorMessage.style.display = "none";
  rideSuccessMessage.style.display = "none";
}

async function setupDashboard() {
  const user = await loadCurrentUser();

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  if (usernameElement) {
    usernameElement.textContent = user.username;
  }

  if (ratingElement) {
    ratingElement.textContent = user.user_rating ?? 0;
  }

  if (user.role !== "driver") {
    return;
  }

  createRideSection.style.display = "block";

  const cars = await loadDriverCars();
  cars.forEach((car) => {
    const option = document.createElement("option");
    option.value = car.car_id;
    option.textContent = `${car.year} ${car.make} ${car.model} (${car.license_plate})`;
    carSelect.appendChild(option);
  });
}

createRideForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  hideRideMessages();

  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/paths/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      showMessage(rideSuccessMessage, "Ride created successfully.");
      this.reset();
      return;
    }

    showMessage(rideErrorMessage, result.error || "Could not create ride.");
  } catch (err) {
    showMessage(rideErrorMessage, "Network error");
  }
});

setupDashboard();
