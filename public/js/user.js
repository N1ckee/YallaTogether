// Använd getDriver för att hämta information om föraren

function getUser() {
  return {
    id: 1,
    firstname: "John",
    lastname: "Doe",
    username: "jdoe",
    email: "john@example.com",
    phonenumber: "123456789",
    role: "driver"
  };
}

function getDriver() {

  return {
    firstname: getUser().firstname,
    lastname: getUser().lastname,
    username: getUser().username,
    carplate: "ABC123",
    car_type: "Sedan",
    fule_cost: 1.5
  };
}
