// Hides the license field by default and shows it only when the driver checkbox is checked
const driver_checkbox = document.getElementById('driver');
const license_field = document.getElementById('license_field');

driver_checkbox.addEventListener('change', function () {
  if (this.checked) {
    license_field.style.display = 'block';
  } else {
    license_field.style.display = 'none';
  }
});

// error handeling
document.getElementById('register_form').addEventListener('submit', async function (e) {
  e.preventDefault(); // Prevent default form submission

  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (response.ok) {
      // Success: handle accordingly (e.g., redirect or show message)
      window.location.href = '/login';
    } else {
      // Error: show error message
      document.getElementById('error_message').textContent = result.error || 'Registration failed';
      document.getElementById('error_message').style.display = 'block';
    }
  } catch (err) {
    document.getElementById('error_message').textContent = 'Network error';
    document.getElementById('error_message').style.display = 'block';
  }
});

