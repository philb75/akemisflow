const testData = {
  firstName: "Test",
  lastName: "Contractor",
  email: "test@example.com",
  phone: "+33123456789",
  company: "Test Company",
  country: "France"
};

console.log("Testing contractor creation...");
console.log("Data to send:", testData);

fetch('http://localhost:3000/api/contractors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
.then(response => {
  console.log("Response status:", response.status);
  console.log("Response headers:", response.headers);
  return response.text();
})
.then(data => {
  console.log("Response body:", data);
})
.catch(error => {
  console.error("Error:", error);
});