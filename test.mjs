// scripts/Background/background.js

async function getModels() {
  try {
    const response = await fetch("https://12c6-34-125-197-138.ngrok-free.app/api/tags");
    const contentType = response.headers.get("content-type");

    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return data;
    } else {
      const text = await response.text();
      console.error("Expected JSON but received:", text);
      throw new Error("Unexpected response format");
    }
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

// Example call to the function for testing
getModels().then(data => {
  if (data) {
    console.log("Models:", data);
  }
});
