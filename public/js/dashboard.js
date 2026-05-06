const usernameElement = document.getElementById("username");
const ratingElement = document.getElementById("rating");
const createRideSection = document.getElementById("create_ride_section");
const createRideForm = document.getElementById("create_ride_form");
const carSelect = document.getElementById("car_id");
const modeToggleBtn = document.getElementById("mode_toggle_btn");
const startLocationInput = document.getElementById("start_location");
const endLocationInput = document.getElementById("end_location");
const rideSearch = document.getElementById("ride-search");
const rideListTitle = document.getElementById("ride_list_title");
const rideList = document.getElementById("ride-list");
const rideErrorMessage = document.getElementById("ride_error_message");
const rideSuccessMessage = document.getElementById("ride_success_message");
const distanceInfo = document.getElementById("distanceInfo");
const useLocationBtn = document.getElementById("useLocationBtn");

let currentUser = null;
let allRides = [];
let map = null;
let startMarker = null;
let endMarker = null;
let routeLine = null;
let rideMarkers = [];
let searchTimer = null;
let startInputTimer = null;
let endInputTimer = null;
let dashboardMode = "user";
let driverCarsLoaded = false;
let syncingLocationFields = false;

const swedenCenter = [59.3293, 18.0686];

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

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

async function loadRides() {
  const response = await fetch("/paths/all");

  if (!response.ok) {
    return [];
  }

  return response.json();
}

async function geocodeLocation(query) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    return null;
  }

  const results = await response.json();

  if (!results.length) {
    return null;
  }

  return {
    lat: Number(results[0].lat),
    lng: Number(results[0].lon),
    label: results[0].display_name
  };
}

async function reverseGeocodeLocation(latlng) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`
  );

  if (!response.ok) {
    return "";
  }

  const result = await response.json();
  return result.display_name || "";
}

function showMessage(element, message) {
  element.textContent = message;
  element.style.display = "block";
}

function hideRideMessages() {
  rideErrorMessage.style.display = "none";
  rideSuccessMessage.style.display = "none";
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const radiusKm = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function initMap() {
  map = L.map("map").setView(swedenCenter, 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  map.on("click", (e) => {
    if (!startMarker) {
      setStartMarker(e.latlng);
      updateLocationInputFromMarker("start");
      return;
    }

    setEndMarker(e.latlng);
    updateLocationInputFromMarker("end");
  });
}

function setStartMarker(latlng) {
  if (startMarker) {
    map.removeLayer(startMarker);
  }

  startMarker = L.marker(latlng, { icon: greenIcon, draggable: true }).addTo(map);
  startMarker.on("dragend", () => {
    drawRoute();
    updateLocationInputFromMarker("start");
  });
  drawRoute();
}

function setEndMarker(latlng) {
  if (endMarker) {
    map.removeLayer(endMarker);
  }

  endMarker = L.marker(latlng, { icon: redIcon, draggable: true }).addTo(map);
  endMarker.on("dragend", () => {
    drawRoute();
    updateLocationInputFromMarker("end");
  });
  drawRoute();
}

async function updateLocationInputFromMarker(type) {
  const marker = type === "start" ? startMarker : endMarker;
  const input = type === "start" ? startLocationInput : endLocationInput;

  if (!marker || !input) {
    return;
  }

  const latlng = marker.getLatLng();
  const locationName = await reverseGeocodeLocation(latlng);

  syncingLocationFields = true;
  input.value = locationName || `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
  syncingLocationFields = false;
}

async function updateMarkerFromLocationInput(type) {
  if (syncingLocationFields) {
    return;
  }

  const input = type === "start" ? startLocationInput : endLocationInput;
  const query = input.value.trim();

  if (!query) {
    return;
  }

  const location = await geocodeLocation(query);

  if (!location) {
    showMessage(rideErrorMessage, `Could not find ${type === "start" ? "start" : "destination"} location.`);
    return;
  }

  const latlng = { lat: location.lat, lng: location.lng };

  if (type === "start") {
    setStartMarker(latlng);
  } else {
    setEndMarker(latlng);
  }

  map.setView(latlng, 12);
}

function drawRoute() {
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }

  if (!startMarker || !endMarker) {
    distanceInfo.textContent = "Select start and arrival points on the map.";
    return;
  }

  const start = startMarker.getLatLng();
  const end = endMarker.getLatLng();

  routeLine = L.polyline([start, end], {
    color: "#2563eb",
    weight: 5
  }).addTo(map);

  const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
  distanceInfo.textContent = `Distance: ${distance.toFixed(2)} km`;
  document.getElementById("distance").value = distance.toFixed(2);
  document.getElementById("estimated_time").value = Math.max(1, Math.round(distance / 60 * 60));
}

function clearRideMarkers() {
  rideMarkers.forEach((marker) => map.removeLayer(marker));
  rideMarkers = [];
}

function addRideMarkers(rides) {
  clearRideMarkers();

  rides.forEach((ride) => {
    if (!ride.end_lat || !ride.end_lng) {
      return;
    }

    const marker = L.marker([ride.end_lat, ride.end_lng], { icon: redIcon })
      .addTo(map)
      .bindPopup(`${ride.start_location} -> ${ride.end_location}`);

    rideMarkers.push(marker);
  });
}

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString();
}

function displayRides(rides) {
  rideList.innerHTML = "";

  if (!rides.length) {
    rideList.innerHTML = "<p>No rides found</p>";
    clearRideMarkers();
    return;
  }

  rides.forEach((ride) => {
    const div = document.createElement("div");
    div.classList.add("ride-card");

    const nearestText = ride.search_distance_km !== undefined
      ? `<p>Distance to searched arrival: ${ride.search_distance_km.toFixed(2)} km</p>`
      : "";

    div.innerHTML = `
      <h3>${ride.start_location} -> ${ride.end_location}</h3>
      <p>Departure: ${formatDateTime(ride.departure_time)}</p>
      <p>Arrival: ${formatDateTime(ride.arrival_time)}</p>
      <p>Driver: ${ride.driver_username}</p>
      <p>Car: ${ride.make} ${ride.model} (${ride.license_plate})</p>
      <p>Seats left: ${ride.available_seats}</p>
      <p>Ride distance: ${Number(ride.distance).toFixed(2)} km</p>
      ${nearestText}
    `;

    rideList.appendChild(div);
  });

  addRideMarkers(rides);
}

function getModeRides() {
  if (dashboardMode !== "driver") {
    return allRides;
  }

  return allRides.filter((ride) => ride.driver_username === currentUser.username);
}

function textFilterRides(query) {
  const normalizedQuery = query.toLowerCase();

  return getModeRides().filter((ride) => (
    ride.start_location.toLowerCase().includes(normalizedQuery) ||
    ride.end_location.toLowerCase().includes(normalizedQuery)
  ));
}

function renderCurrentRideList() {
  const query = rideSearch.value.trim();

  if (query) {
    searchRides();
    return;
  }

  displayRides(getModeRides());
}

async function searchRides() {
  const query = rideSearch.value.trim();

  if (!query) {
    displayRides(getModeRides());
    return;
  }

  const geocoded = await geocodeLocation(query);

  if (!geocoded) {
    displayRides(textFilterRides(query));
    return;
  }

  const sorted = getModeRides()
    .filter((ride) => ride.end_lat && ride.end_lng)
    .map((ride) => ({
      ...ride,
      search_distance_km: calculateDistance(
        geocoded.lat,
        geocoded.lng,
        Number(ride.end_lat),
        Number(ride.end_lng)
      )
    }))
    .sort((a, b) => a.search_distance_km - b.search_distance_km);

  displayRides(sorted);
  map.setView([geocoded.lat, geocoded.lng], 11);
}

function setupSearch() {
  rideSearch.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(searchRides, 500);
  });
}

async function loadCreateRideCars() {
  if (driverCarsLoaded) {
    return;
  }

  const cars = await loadDriverCars();
  cars.forEach((car) => {
    const option = document.createElement("option");
    option.value = car.car_id;
    option.textContent = `${car.year} ${car.make} ${car.model} (${car.license_plate})`;
    carSelect.appendChild(option);
  });

  driverCarsLoaded = true;
}

async function setDashboardMode(mode) {
  dashboardMode = mode;
  rideSearch.value = "";

  if (dashboardMode === "driver") {
    createRideSection.style.display = "block";
    modeToggleBtn.textContent = "Switch to User Mode";
    rideListTitle.textContent = "Your Rides";
    await loadCreateRideCars();
  } else {
    createRideSection.style.display = "none";
    modeToggleBtn.textContent = "Switch to Driver Mode";
    rideListTitle.textContent = "Rides";
  }

  renderCurrentRideList();
}

function setupModeToggle() {
  modeToggleBtn.addEventListener("click", () => {
    setDashboardMode(dashboardMode === "driver" ? "user" : "driver");
  });
}

function setupCurrentLocationButton() {
  useLocationBtn.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition((position) => {
      const userLatLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      map.setView(userLatLng, 13);
      setStartMarker(userLatLng);
      updateLocationInputFromMarker("start");
    });
  });
}

function setupCreateRideLocationInputs() {
  startLocationInput.addEventListener("input", () => {
    clearTimeout(startInputTimer);
    startInputTimer = setTimeout(() => updateMarkerFromLocationInput("start"), 700);
  });

  endLocationInput.addEventListener("input", () => {
    clearTimeout(endInputTimer);
    endInputTimer = setTimeout(() => updateMarkerFromLocationInput("end"), 700);
  });

  startLocationInput.addEventListener("change", () => {
    updateMarkerFromLocationInput("start");
  });

  endLocationInput.addEventListener("change", () => {
    updateMarkerFromLocationInput("end");
  });
}

async function fillMissingCreateRideCoordinates(data) {
  if (!startMarker) {
    const start = await geocodeLocation(data.start_location);
    if (start) {
      setStartMarker({ lat: start.lat, lng: start.lng });
    }
  }

  if (!endMarker) {
    const end = await geocodeLocation(data.end_location);
    if (end) {
      setEndMarker({ lat: end.lat, lng: end.lng });
    }
  }
}

async function setupDashboard() {
  initMap();
  setupSearch();
  setupCurrentLocationButton();
  setupCreateRideLocationInputs();
  setupModeToggle();

  currentUser = await loadCurrentUser();

  if (!currentUser) {
    window.location.href = "/login.html";
    return;
  }

  usernameElement.textContent = currentUser.username;
  ratingElement.textContent = currentUser.user_rating ?? 0;

  allRides = await loadRides();
  renderCurrentRideList();

  if (currentUser.role !== "driver") {
    return;
  }

  modeToggleBtn.style.display = "inline-block";
}

createRideForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  hideRideMessages();

  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  await fillMissingCreateRideCoordinates(data);

  if (!startMarker || !endMarker) {
    showMessage(rideErrorMessage, "Select start and arrival points on the map, or enter locations that can be found.");
    return;
  }

  const start = startMarker.getLatLng();
  const end = endMarker.getLatLng();
  const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);

  data.distance = distance.toFixed(2);
  data.start_lat = start.lat;
  data.start_lng = start.lng;
  data.end_lat = end.lat;
  data.end_lng = end.lng;

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
      allRides = await loadRides();
      renderCurrentRideList();
      return;
    }

    showMessage(rideErrorMessage, result.error || "Could not create ride.");
  } catch (err) {
    showMessage(rideErrorMessage, "Network error");
  }
});

setupDashboard();
