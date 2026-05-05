
// fetch and display cars on page load

window.addEventListener("load", async () => {
  try {
    const response = await fetch("/cars/get");

    if (!response.ok) {
      throw new Error("Failed to fetch cars");
    }

    const cars = await response.json();
    const list = document.getElementById("cars");

    list.innerHTML = "";

    cars.forEach((car) => {
      const li = document.createElement("car_list");

      li.textContent =
        `${car.year} ${car.make} ${car.model} ` +
        `(${car.color ?? "unknown color"}) - ` +
        `Plate: ${car.license_plate}, ` +
        `Seats: ${car.passenger_capacity}, ` +
        `Fuel: ${car.fuel_type ?? "unknown"}, ` +
        `Efficiency: ${car.fuel_efficiency ?? "unknown"}`;

      list.appendChild(li);
    });
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
      document.getElementById('error_message').textContent = result.error || 'Login failed';
      document.getElementById('error_message').style.display = 'block';
    }
  } catch (err) {
    document.getElementById('error_message').textContent = 'Network error';
    document.getElementById('error_message').style.display = 'block';
  }
}); 
