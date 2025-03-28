const Consul = require('consul');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get values from `.env`
const CONSUL_SERVICE_ID = process.env.CONSUL_SERVICE_ID;
const CONSUL_SERVICE_NAME = process.env.CONSUL_SERVICE_NAME;
const CONSUL_HOST = process.env.CONSUL_HOST;
const CONSUL_PORT = parseInt(process.env.CONSUL_PORT, 10); // Ensure it's a number
const API_GATEWAY_PORT = parseInt(process.env.PORT, 10); // API Gateway Port

// Create a Consul client with HTTPS
const consul = new Consul({
    host: CONSUL_HOST,
    port: CONSUL_PORT,
    secure: true,  // Enable HTTPS because Render provides an HTTPS endpoint
    promisify: true,
});

// Function to register API Gateway
const registerService = async () => {
    try {
        console.log(`🚀 Registering Service: ${CONSUL_SERVICE_NAME} (${CONSUL_SERVICE_ID})...`);

        await consul.agent.service.register({
            id: CONSUL_SERVICE_ID,
            name: CONSUL_SERVICE_NAME,
            address: CONSUL_HOST, // Ensure this matches your API Gateway's IP or domain
            port: API_GATEWAY_PORT, // Your API Gateway's running port
            check: {
                http: `https://${CONSUL_HOST}/v1/agent/checks`, // Use HTTPS
                interval: '10s',
                timeout: '5s',
            },
        });

        console.log('✅ API Gateway successfully registered in Consul');

        // Verify if the service is registered
        setTimeout(async () => {
            await logRegisteredServices();
        }, 3000);

    } catch (err) {
        console.error('❌ Error registering API Gateway in Consul:', err);
    }
};

// Function to log all registered services in Consul
const logRegisteredServices = async () => {
    try {
        const services = await consul.agent.service.list();
        console.log('🔍 Registered Services in Consul:', services);
    } catch (err) {
        console.error('❌ Error fetching registered services:', err);
    }
};

// Gracefully deregister service when shutting down
process.on('SIGINT', async () => {
    try {
        await consul.agent.service.deregister(CONSUL_SERVICE_ID);
        console.log('✅ API Gateway deregistered from Consul');
        process.exit();
    } catch (err) {
        console.error('❌ Error deregistering service:', err);
        process.exit(1);
    }
});

// Start registration process
registerService();

module.exports = consul;
