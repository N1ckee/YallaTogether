
const carsPage = document.getElementById("cars_page");
const errorMessage = document.getElementById("error_message");

async function loadCurrentUser() {
  const response = await fetch("/users/me");

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function loadCars() {
  const response = await fetch("/cars/get");

  if (!response.ok) {
    throw new Error("Failed to fetch cars");
  }

  const cars = await response.json();
  const list = document.getElementById("cars");

  list.innerHTML = "";

  cars.forEach((car) => {
    const li = document.createElement("li");

    li.textContent =
      `${car.year} ${car.make} ${car.model} ` +
      `(${car.color ?? "unknown color"}) - ` +
      `Plate: ${car.license_plate}, ` +
      `Seats: ${car.passenger_capacity}, ` +
      `Fuel: ${car.fuel_type ?? "unknown"}, ` +
      `Efficiency: ${car.fuel_efficiency ?? "unknown"}`;

    list.appendChild(li);
  });
}

window.addEventListener("load", async () => {
  try {
    const user = await loadCurrentUser();

    if (!user) {
      window.location.href = "/login.html";
      return;
    }

    if (user.role !== "driver") {
      window.location.href = "/profile.html";
      return;
    }

    carsPage.style.display = "block";
    await loadCars();
  } catch (err) {
    console.error("Error loading cars:", err);
  }
});
// For adding a new car

document.getElementById('add_car_form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/cars/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (response.ok) {
      // Success: handle accordingly (e.g., redirect or show message)
      window.location.href = '../dashboard.html'; // Redirect to dashboard or desired page
    } else {
      // Error: show error message
      errorMessage.textContent = result.error || 'Could not add car';
      errorMessage.style.display = 'block';
    }
  } catch (err) {
    errorMessage.textContent = 'Network error';
    errorMessage.style.display = 'block';
  }
}); 
