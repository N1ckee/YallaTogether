document.getElementById('login_form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    if (response.ok) {
      // Success: handle accordingly (e.g., redirect or show message)
      window.location.href = '/dashboard';
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

