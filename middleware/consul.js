const Consul = require("consul");


const consul = new Consul({
  host: "consul-hn1i.onrender.com",
  port: 443,
  promisify: true,
  secure: true,
  timeout: 300000,
});

// Service registration details
const CONSUL_SERVICE_ID = "Express_Gateway";
const CONSUL_SERVICE_NAME = "Express_Gateway";
const SERVICE_HOST = "express-gateway-iu1f.onrender.com";
const SERVICE_PORT = 4000;

// Register service in Consul with error handling
const registerService = async () => {
  try {
    await consul.agent.service.register({
      id: CONSUL_SERVICE_ID,
      name: CONSUL_SERVICE_NAME,
      address: SERVICE_HOST,
      port: SERVICE_PORT,
    });
    console.log("✅ Gateway Service successfully registered in Consul");
  } catch (err) {
    console.error("❌ Consul registration failed:", err.message);
    // Don’t crash; retry later
  }
};

// Keep Consul connection alive with error handling
const checkConsulConnection = async () => {
  try {
    await consul.agent.self();
    console.log("✅ Consul connection is active.");
  } catch (err) {
    console.error("❌ Consul connection lost. Attempting to reconnect...");
    await registerService(); // Retry registration
  }
};

// Initial registration and periodic check
registerService();
setInterval(checkConsulConnection, 300000); // Every 30 seconds

// Graceful shutdown
process.on("SIGINT", async () => {
  try {
    await consul.agent.service.deregister(CONSUL_SERVICE_ID);
    console.log("✅ Report Service deregistered from Consul");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error deregistering service:", err.message);
    process.exit(1);
  }
});

// Export middleware
module.exports = (req, res, next) => {
  req.consul = consul; // Attach consul to request object
  next();
};