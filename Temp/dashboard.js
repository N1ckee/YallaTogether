// Define user/session variables at the top
let username = '';
let role = '';
let user_id = '';
let token = getCookie('token');

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

fetch('/userinfo/user', {
  credentials: 'include'
})
  .then(res => {
    if (!res.ok) throw new Error('Failed to fetch user info');
    // Optionally, get token from cookie or elsewhere if needed
    return res.json();
  })
  .then(data => {
    username = data.username;
    role = data.role;
    user_id = data.id;
    // Optionally, set token if returned by backend
    token = data.token;

    document.getElementById('username').textContent = username;
    document.getElementById('role').textContent = role;

    document.getElementById("welcomeText").textContent =
      "Welcome " + username + " (" + role + "#" + user_id + "  )";
    if (role === "driver") {
      const form = document.getElementById("driverForm");
      if (form) {
        form.style.display = "block";
      }
    }

    // Now initialize the rest of the dashboard logic
    initDashboard();
  })
  .catch(err => {
    console.error('Error fetching user info:', err);
    // Optionally redirect to login or show error
    window.location.href = "login.html";
  });

// All dashboard logic that depends on user info goes here
function initDashboard() {
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
  //delet cookie
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "login.html";
});
  // ... move the rest of your dashboard.js code here ...
}
const map = L.map("map").setView([59.3293, 18.0686], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

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

let startMarker = null;
let endMarker = null;
let routeLine = null;

map.on("click", function (e) {
  if (!startMarker) {
    startMarker = L.marker(e.latlng, { icon: greenIcon, draggable: true }).addTo(map);
  } else if (!endMarker) {
    endMarker = L.marker(e.latlng, { icon: redIcon, draggable: true }).addTo(map);
    drawRoute();
  }
});

function drawRoute() {
  if (routeLine) {
    map.removeLayer(routeLine);
  }

  const latlngs = [
    startMarker.getLatLng(),
    endMarker.getLatLng()
  ];

  routeLine = L.polyline(latlngs, {
    color: "#2563eb",
    weight: 5
  }).addTo(map);

  const distance = calculateDistance(
    latlngs[0].lat,
    latlngs[0].lng,
    latlngs[1].lat,
    latlngs[1].lng
  );

  document.getElementById("distanceInfo").textContent =
    "Distance: " + distance.toFixed(2) + " km";
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

document.getElementById("useLocationBtn").addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(position => {
    const userLatLng = [
      position.coords.latitude,
      position.coords.longitude
    ];

    map.setView(userLatLng, 13);

    if (startMarker) {
      map.removeLayer(startMarker);
    }

    startMarker = L.marker(userLatLng, {
      icon: greenIcon,
      draggable: true
    }).addTo(map);
  });
});
//  show ride from backend
const ridesContainer = document.getElementById("contentArea");

async function loadRides() {
  try {
    const response = await fetch("/paths/all");

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load rides");
    }

    allRides = data;
    displayRides(allRides);

  } catch (err) {
    console.error(err);
    ridesContainer.innerHTML = "<p>❌ Failed to load rides</p>";
  }
}

function displayRides(rides) {
  ridesContainer.innerHTML = "";

  const filteredRides =
    role === "driver"
      ? rides.filter(ride => ride.driver === username)
      : rides;
  if (filteredRides.length === 0) {
    ridesContainer.innerHTML = "<p>No rides yet</p>";
    return;
  }
  filteredRides.forEach(ride => {
    const div = document.createElement("div");
    div.classList.add("ride-card");

    div.innerHTML = `
      <h3>${ride.from} → ${ride.to}</h3>
      <p>Time: ${ride.time}</p>
      <p>Driver: ${ride.driver}</p>
      <p>Car: ${ride.car || "N/A"}</p>
      <p>Seats left: ${ride.seats}</p>
      <button class="book-btn" data-id="${ride.id}">Book</button>
    `;

    ridesContainer.appendChild(div);
  });
}

// booka ride
document.addEventListener("click", async function (e) {
  if (e.target.classList.contains("book-btn")) {
    const rideId = e.target.dataset.id;
    const ride = allRides.find(r => r.id == rideId);
    if (!ride) {
      alert("Ride not found.");
      return;
    }
    if (ride.driver === username) {
      alert("You cannot book your own ride.");
      return;
    }
    if (ride.seats <= 0) {
      alert("No seats left for this ride.");
      return;
    }

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ rideId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Booking failed");
      }

      alert("✅ Ride booked!");
      loadRides(); // Refresh rides after booking

    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }
});

// load ride
loadRides();
document.getElementById("fromInput").addEventListener("input", filterRides);
document.getElementById("toInput").addEventListener("input", filterRides);

function filterRides() {
  const fromValue = document.getElementById("fromInput").value.toLowerCase();
  const toValue = document.getElementById("toInput").value.toLowerCase();

  const filtered = allRides.filter(ride => {
    return (
      ride.from.toLowerCase().includes(fromValue) &&
      ride.to.toLowerCase().includes(toValue)
    );
  });

  displayRides(filtered);
}


// Handle adding a new ride when the "Add Ride" button is clicked
const addBtn = document.getElementById("addRideBtn");

if (addBtn) {
  addBtn.addEventListener("click", async () => {
    // Collect route and form data
    const start = startMarker
      ? startMarker.getLatLng().lat + "," + startMarker.getLatLng().lng
      : document.getElementById("driverFrom").value;

    const destination = endMarker
      ? endMarker.getLatLng().lat + "," + endMarker.getLatLng().lng
      : document.getElementById("driverTo").value;

    // Ensure path_data is an array of [lat, lng] pairs for jsonb
    let path_data = [document.getElementById("driverFrom").value, document.getElementById("driverTo").value];
    if (typeof startMarker !== "undefined" && typeof endMarker !== "undefined" && startMarker && endMarker) {
      path_data = [
        [startMarker.getLatLng().lat, startMarker.getLatLng().lng],
        [endMarker.getLatLng().lat, endMarker.getLatLng().lng]
      ];
    };

    const eta = document.getElementById("driverTime").value;
    const seats = document.getElementById("driverSeats").value;
    const length = document.getElementById("distanceInfo").textContent.replace("Distance: ", "").replace(" km", "");

    // Validate required fields
    if (!start || !destination || !eta || !seats) {
      alert("Please fill all fields");
      return;
    }

    // Ensure required variables are defined
    if (typeof length === "undefined" || typeof user_id === "undefined") {
      console.error("Missing data:", { length, user_id });
      alert("Internal error: Missing required data (length, user_id).");
      return;
    }

    const createdata = {
      path_data,
      start,
      destination,
      length,
      eta,
      user_id,
      seats
    }

    console.log("Creating ride with data:", createdata);

    try {
      const response = await fetch("/paths/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createdata)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add ride");
      }

      alert("✅ Ride added!");

      // Reload rides if function is available
      if (typeof loadRides === "function") {
        loadRides();
      }

    } catch (err) {
      console.error(err);
      alert(err.message || "An unexpected error occurred.");
    }
  });
}
