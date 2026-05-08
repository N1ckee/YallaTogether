const usernameElement = document.getElementById("username");
const ratingElement = document.getElementById("rating");
const createRideSection = document.getElementById("create_ride_section");
const createRideForm = document.getElementById("create_ride_form");
const carSelect = document.getElementById("car_id");
const modeToggleBtn = document.getElementById("mode_toggle_btn");
const startLocationInput = document.getElementById("start_location");
const endLocationInput = document.getElementById("end_location");
const departureTimeInput = document.getElementById("departure_time");
const rideSearch = document.getElementById("ride-search");
const rideListTitle = document.getElementById("ride_list_title");
const rideList = document.getElementById("ride-list");
const rideErrorMessage = document.getElementById("ride_error_message");
const rideSuccessMessage = document.getElementById("ride_success_message");
const distanceInfo = document.getElementById("distanceInfo");
const useLocationBtn = document.getElementById("useLocationBtn");
const bookRideBtn = document.getElementById("bookRideBtn");
const removeRideBtn = document.getElementById("removeRideBtn");
const bookingMessage = document.getElementById("booking_message");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;
let allRides = [];
let map = null;
let startMarker = null;
let endMarker = null;
let userLocationMarker = null;
let routeLine = null;
let selectedRideId = null;
let selectedRide = null;
let currentRoutePath = [];
let currentRouteDistanceKm = 0;
let currentRouteEtaMinutes = 0;
let rideMarkers = [];
let stopMarkers = [];
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

const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
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

function showBookingMessage(message, type = "error") {
  bookingMessage.textContent = message;
  bookingMessage.className = `booking-message ${type}`;
  bookingMessage.style.display = "block";
}

function hideBookingMessage() {
  bookingMessage.style.display = "none";
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
    if (dashboardMode !== "driver") {
      setUserLocationMarker(e.latlng);
      return;
    }

    if (!startMarker) {
      setStartMarker(e.latlng);
      updateLocationInputFromMarker("start");
      return;
    }

    setEndMarker(e.latlng);
    updateLocationInputFromMarker("end");
  });
}

function setUserLocationMarker(latlng) {
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
  }

  userLocationMarker = L.marker(latlng, { icon: blueIcon, draggable: true })
    .addTo(map)
    .bindPopup("Your location");
}

function clearUserLocationMarker() {
  if (userLocationMarker) {
    map.removeLayer(userLocationMarker);
    userLocationMarker = null;
  }
}

function setStartMarker(latlng) {
  if (startMarker) {
    map.removeLayer(startMarker);
  }

  startMarker = L.marker(latlng, { icon: greenIcon, draggable: true }).addTo(map);
  startMarker.on("dragend", () => {
    updateRoute();
    updateLocationInputFromMarker("start");
  });
  updateRoute();
}

function setEndMarker(latlng) {
  if (endMarker) {
    map.removeLayer(endMarker);
  }

  endMarker = L.marker(latlng, { icon: redIcon, draggable: true }).addTo(map);
  endMarker.on("dragend", () => {
    updateRoute();
    updateLocationInputFromMarker("end");
  });
  updateRoute();
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

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  return `${minutes} min`;
}

async function fetchRoutePath(start, end) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  const route = result.routes?.[0];

  if (!route) {
    return null;
  }

  return route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

async function updateRoute() {
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }

  if (!startMarker || !endMarker) {
    currentRoutePath = [];
    currentRouteDistanceKm = 0;
    currentRouteEtaMinutes = 0;
    distanceInfo.textContent = "Select start and arrival points on the map.";
    return;
  }

  const start = startMarker.getLatLng();
  const end = endMarker.getLatLng();
  const routedPath = await fetchRoutePath(start, end);

  if (!routedPath) {
    currentRoutePath = [];
    currentRouteDistanceKm = 0;
    currentRouteEtaMinutes = 0;
    distanceInfo.textContent = "Could not calculate a road route between these points.";
    return;
  }

  routeLine = L.polyline(routedPath, {
    color: "#2563eb",
    weight: 5
  }).addTo(map);

  currentRoutePath = routedPath;
  currentRouteDistanceKm = calculatePathDistance(routedPath);
  currentRouteEtaMinutes = Math.max(1, Math.round(currentRouteDistanceKm / 40 * 60));

  distanceInfo.textContent =
    `Distance: ${currentRouteDistanceKm.toFixed(2)} km | ETA: ${formatDuration(currentRouteEtaMinutes)}`;
  document.getElementById("distance").value = currentRouteDistanceKm.toFixed(2);
  document.getElementById("estimated_time").value = currentRouteEtaMinutes;
}

function clearDisplayedRoute() {
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }

  clearStopMarkers();
  currentRoutePath = [];
  currentRouteDistanceKm = 0;
  currentRouteEtaMinutes = 0;
}

function calculatePathDistance(path) {
  let distance = 0;

  for (let i = 1; i < path.length; i += 1) {
    distance += calculateDistance(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
  }

  return distance;
}

function calculateArrivalTime(departureTime, durationMinutes) {
  const departure = new Date(departureTime);

  if (Number.isNaN(departure.getTime())) {
    return "";
  }

  departure.setMinutes(departure.getMinutes() + durationMinutes);
  return formatDateTimeForInput(departure);
}

function formatDateTimeForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function clearRideMarkers() {
  rideMarkers.forEach((marker) => map.removeLayer(marker));
  rideMarkers = [];
}

function clearStopMarkers() {
  stopMarkers.forEach((marker) => map.removeLayer(marker));
  stopMarkers = [];
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

  return new Date(value).toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function parseRidePath(pathData) {
  if (Array.isArray(pathData)) {
    return pathData;
  }

  if (typeof pathData !== "string") {
    return [];
  }

  try {
    const parsedPath = JSON.parse(pathData);
    return Array.isArray(parsedPath) ? parsedPath : [];
  } catch (err) {
    return [];
  }
}

function parseRideStops(stopsData) {
  if (Array.isArray(stopsData)) {
    return stopsData;
  }

  if (typeof stopsData !== "string") {
    return [];
  }

  try {
    const parsedStops = JSON.parse(stopsData);
    return Array.isArray(parsedStops) ? parsedStops : [];
  } catch (err) {
    return [];
  }
}

function parseRidePassengers(passengersData) {
  if (Array.isArray(passengersData)) {
    return passengersData;
  }

  if (typeof passengersData !== "string") {
    return [];
  }

  try {
    const parsedPassengers = JSON.parse(passengersData);
    return Array.isArray(parsedPassengers) ? parsedPassengers : [];
  } catch (err) {
    return [];
  }
}

function clearCreationMarkers() {
  if (startMarker) {
    map.removeLayer(startMarker);
    startMarker = null;
  }

  if (endMarker) {
    map.removeLayer(endMarker);
    endMarker = null;
  }
}

function driverOwnsRide(ride) {
  return dashboardMode === "driver" &&
    currentUser &&
    ride.driver_username === currentUser.username;
}

function userHasBookedRide(ride) {
  if (!currentUser || !ride) {
    return false;
  }

  return parseRidePassengers(ride.passanges).some((passenger) => (
    Number(passenger.user_id) === Number(currentUser.user_id)
  ));
}

function addStopMarkersForRide(ride) {
  clearStopMarkers();

  if (!driverOwnsRide(ride)) {
    return;
  }

  parseRideStops(ride.stops).forEach((stop, index) => {
    const lat = Number(stop.lat);
    const lng = Number(stop.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const popupContent = document.createElement("div");
    const stopName = document.createElement("strong");
    const stopLabel = document.createElement("div");

    stopName.textContent = stop.username ? `${stop.username}'s stop` : `Stop ${index + 1}`;
    stopLabel.textContent = stop.label || "";
    popupContent.append(stopName);

    if (stop.label) {
      popupContent.append(stopLabel);
    }

    const marker = L.marker([lat, lng], { icon: blueIcon })
      .addTo(map)
      .bindPopup(popupContent);

    stopMarkers.push(marker);
  });
}

function loadRidePath(ride, ridesToRender = getVisibleRides()) {
  selectedRideId = ride.path_id;
  selectedRide = ride;
  hideBookingMessage();
  clearDisplayedRoute();
  clearCreationMarkers();

  const path = parseRidePath(ride.path_data);

  if (path.length > 0) {
    routeLine = L.polyline(path, {
      color: "#2563eb",
      weight: 5
    }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
  } else if (ride.start_lat && ride.start_lng && ride.end_lat && ride.end_lng) {
    routeLine = L.polyline(
      [
        [ride.start_lat, ride.start_lng],
        [ride.end_lat, ride.end_lng]
      ],
      {
        color: "#2563eb",
        weight: 5,
        dashArray: "8 8"
      }
    ).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
  }

  startMarker = L.marker([ride.start_lat, ride.start_lng], { icon: greenIcon })
    .addTo(map)
    .bindPopup(`Start: ${ride.start_location}`);
  endMarker = L.marker([ride.end_lat, ride.end_lng], { icon: redIcon })
    .addTo(map)
    .bindPopup(`Destination: ${ride.end_location}`);

  addStopMarkersForRide(ride);
  displayRides(ridesToRender);
  updateRideActionButtonStates();
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
    div.tabIndex = 0;
    div.setAttribute("role", "button");
    div.setAttribute("aria-label", `Load ride from ${ride.start_location} to ${ride.end_location}`);

    if (ride.path_id === selectedRideId) {
      div.classList.add("selected");
    }

    const isBooked = userHasBookedRide(ride);

    if (isBooked) {
      div.classList.add("booked");
    }

    const nearestText = ride.search_distance_km !== undefined
      ? `<p>Distance to searched arrival: ${ride.search_distance_km.toFixed(2)} km</p>`
      : "";
    const bookedText = isBooked ? `<p class="booked-label">Booked</p>` : "";

    div.innerHTML = `
      <h3>${ride.start_location} -> ${ride.end_location}</h3>
      ${bookedText}
      <p>Departure: ${formatDateTime(ride.departure_time)}</p>
      <p>Arrival: ${formatDateTime(ride.arrival_time)}</p>
      <p>Driver: ${ride.driver_username}</p>
      <p>Car: ${ride.make} ${ride.model} (${ride.license_plate})</p>
      <p>Seats left: ${ride.available_seats}</p>
      <p>Ride distance: ${Number(ride.distance).toFixed(2)} km</p>
      ${nearestText}
    `;

    div.addEventListener("click", () => loadRidePath(ride, rides));
    div.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        loadRidePath(ride, rides);
      }
    });

    rideList.appendChild(div);
  });

  addRideMarkers(rides);
}

function getVisibleRides() {
  if (dashboardMode !== "driver") {
    return allRides;
  }

  return allRides.filter((ride) => ride.driver_username === currentUser.username);
}

function textFilterRides(query) {
  const normalizedQuery = query.toLowerCase();

  return getVisibleRides().filter((ride) => (
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

  displayRides(getVisibleRides());
}

async function searchRides() {
  const query = rideSearch.value.trim();

  if (!query) {
    displayRides(getVisibleRides());
    return;
  }

  const geocoded = await geocodeLocation(query);

  if (!geocoded) {
    displayRides(textFilterRides(query));
    return;
  }

  const sorted = getVisibleRides()
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
  selectedRideId = null;
  selectedRide = null;
  clearDisplayedRoute();
  hideBookingMessage();

  if (dashboardMode === "driver") {
    createRideSection.style.display = "block";
    modeToggleBtn.textContent = "Switch to User Mode";
    rideListTitle.textContent = "Your Rides";
    rideList.classList.remove("ride-list-scroll");
    bookRideBtn.style.display = "none";
    removeRideBtn.style.display = "inline-block";
    clearUserLocationMarker();
    await loadCreateRideCars();
  } else {
    createRideSection.style.display = "none";
    modeToggleBtn.textContent = "Switch to Driver Mode";
    rideListTitle.textContent = "Rides";
    rideList.classList.add("ride-list-scroll");
    bookRideBtn.style.display = "inline-block";
    removeRideBtn.style.display = "none";
    clearCreationMarkers();
  }

  renderCurrentRideList();
  updateRideActionButtonStates();
}

function setupModeToggle() {
  modeToggleBtn.addEventListener("click", () => {
    setDashboardMode(dashboardMode === "driver" ? "user" : "driver");
  });
}

function setupLogoutButton() {
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login.html";
    }
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

      if (dashboardMode === "driver") {
        setStartMarker(userLatLng);
        updateLocationInputFromMarker("start");
        return;
      }

      setUserLocationMarker(userLatLng);
    });
  });
}

function updateBookButtonState() {
  if (dashboardMode !== "user") {
    bookRideBtn.disabled = true;
    return;
  }

  const seatsAvailable = selectedRide && Number(selectedRide.available_seats) > 0;
  bookRideBtn.disabled = !seatsAvailable || userHasBookedRide(selectedRide);
}

function updateRemoveButtonState() {
  if (dashboardMode !== "driver") {
    removeRideBtn.disabled = true;
    return;
  }

  removeRideBtn.disabled = !selectedRide || !driverOwnsRide(selectedRide);
}

function updateRideActionButtonStates() {
  updateBookButtonState();
  updateRemoveButtonState();
}

async function setupBookRideButton() {
  bookRideBtn.addEventListener("click", async () => {
    hideBookingMessage();

    if (!selectedRide) {
      showBookingMessage("Select a ride first.");
      return;
    }

    if (Number(selectedRide.available_seats) <= 0) {
      updateRideActionButtonStates();
      showBookingMessage("No seats are available for this ride.");
      return;
    }

    if (userHasBookedRide(selectedRide)) {
      updateRideActionButtonStates();
      showBookingMessage("You have already booked this ride.");
      return;
    }

    if (!userLocationMarker) {
      showBookingMessage("Place your location with the blue marker before booking.");
      return;
    }

    const latlng = userLocationMarker.getLatLng();
    bookRideBtn.disabled = true;

    try {
      const label = await reverseGeocodeLocation(latlng);
      const response = await fetch(`/paths/${selectedRide.path_id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: latlng.lat,
          lng: latlng.lng,
          label
        })
      });

      const result = await response.json();

      if (!response.ok) {
        showBookingMessage(result.error || "Could not book ride.");
        updateRideActionButtonStates();
        return;
      }

      allRides = allRides.map((ride) => (
        ride.path_id === result.path_id ? { ...ride, ...result } : ride
      ));
      selectedRide = { ...selectedRide, ...result };
      selectedRideId = result.path_id;
      addStopMarkersForRide(selectedRide);
      showBookingMessage("Ride booked.", "success");
      renderCurrentRideList();
      updateRideActionButtonStates();
    } catch (err) {
      showBookingMessage("Network error");
      updateRideActionButtonStates();
    }
  });
}

function setupRemoveRideButton() {
  removeRideBtn.addEventListener("click", async () => {
    hideBookingMessage();

    if (!selectedRide) {
      showBookingMessage("Select one of your rides first.");
      return;
    }

    removeRideBtn.disabled = true;

    try {
      const response = await fetch(`/paths/${selectedRide.path_id}`, {
        method: "DELETE"
      });
      const result = await response.json();

      if (!response.ok) {
        showBookingMessage(result.error || "Could not remove ride.");
        updateRideActionButtonStates();
        return;
      }

      allRides = allRides.filter((ride) => ride.path_id !== result.path_id);
      selectedRideId = null;
      selectedRide = null;
      clearDisplayedRoute();
      clearCreationMarkers();
      showBookingMessage("Ride removed.", "success");
      renderCurrentRideList();
      updateRideActionButtonStates();
    } catch (err) {
      showBookingMessage("Network error");
      updateRideActionButtonStates();
    }
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

function setupCarSelectRedirect() {
  carSelect.addEventListener("change", () => {
    if (carSelect.value === "__add_car__") {
      window.location.href = "/cars.html";
    }
  });
}

function setupDepartureTimeInput() {
  if (!departureTimeInput) {
    return;
  }

  departureTimeInput.lang = "sv-SE";
  departureTimeInput.min = formatDateTimeForInput(new Date());
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
  setupBookRideButton();
  setupRemoveRideButton();
  setupLogoutButton();
  setupCreateRideLocationInputs();
  setupCarSelectRedirect();
  setupDepartureTimeInput();
  setupModeToggle();

  currentUser = await loadCurrentUser();

  if (!currentUser) {
    window.location.href = "/login.html";
    return;
  }

  usernameElement.textContent = currentUser.username;
  ratingElement.textContent = currentUser.user_rating ?? 0;
  rideList.classList.add("ride-list-scroll");

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

  await updateRoute();

  if (!currentRoutePath.length) {
    showMessage(rideErrorMessage, "Could not calculate a road route for this ride.");
    return;
  }

  const start = startMarker.getLatLng();
  const end = endMarker.getLatLng();

  data.distance = currentRouteDistanceKm.toFixed(2);
  data.estimated_time = currentRouteEtaMinutes;
  data.arrival_time = calculateArrivalTime(data.departure_time, currentRouteEtaMinutes);
  data.start_lat = start.lat;
  data.start_lng = start.lng;
  data.end_lat = end.lat;
  data.end_lng = end.lng;
  data.path_data = currentRoutePath;

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
