const express = require('express');
require('dotenv').config();
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4000;

// Set API Gateway to Public Mode
const isPublic = true;

// Public Consul Server URL
const CONSUL_HOST = process.env.CONSUL_HOST || 'consul-jz12.onrender.com';
const CONSUL_PORT = process.env.CONSUL_PORT || 443;

// Setup CORS
app.use(cors());
app.use(express.json()); // Support JSON payloads

// Health Check Route for Consul
app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway is healthy' });
});

// Function to fetch the respective service details from Consul
const fetchingService = async (requestedService) => {
    try {
        console.log(`🔎 Fetching service details for ${requestedService} from Consul...`);

        // Make request to Consul to get service details
        const response = await axios.get(`https://${CONSUL_HOST}:${CONSUL_PORT}/v1/catalog/service/${requestedService}`);

        if (response.data.length === 0) {
            throw new Error(`❌ Service '${requestedService}' not registered in Consul`);
        }

        // Find a publicly accessible service (NOT localhost)
        const publicService = response.data.find(service => service.Address !== "127.0.0.1");

        if (!publicService) {
            throw new Error(`❌ No public instance found for service '${requestedService}'`);
        }

        // Construct the correct service URL
        const serviceUrl = `http://${publicService.Address}:${publicService.ServicePort}`;

        console.log(`✅ Fetched public service URL for ${requestedService}: ${serviceUrl}`);
        return serviceUrl;
    } catch (error) {
        console.error(`❌ Error fetching service details for ${requestedService}: ${error.message}`);
        throw new Error(error.message);
    }
};

// Middleware to forward requests to the respective microservices
const forwardRequest = (serviceName) => {
    return async (req, res) => {
        try {
            console.log(`🔄 Forwarding request to ${serviceName} service...`);

            // Get service name from environment variables (fallback to default serviceName)
            const serviceNameEnv = process.env[`${serviceName}`] || serviceName;

            if (!serviceNameEnv) {
                throw new Error(`Environment variable for ${serviceName}_SERVICE_NAME is not defined`);
            }

            // Fetch the actual service URL from Consul
            const serviceUrl = await fetchingService(serviceNameEnv);

            // Forward the request to the actual service
            const serviceResponse = await axios({
                method: req.method,
                url: `${serviceUrl}${req.url}`, // Append original path
                headers: { ...req.headers, host: undefined }, // Remove host header to avoid conflicts
                data: req.body,
            });

            // Send back the service's response
            res.status(serviceResponse.status).json(serviceResponse.data);
        } catch (error) {
            console.error(`❌ Error forwarding request to ${serviceName}:`, error.message);
            res.status(500).json({ error: error.message });
        }
    };
};


// Define API gateways for each service
app.use('/poc_gateway', forwardRequest('POC_SERVICE_NAME'));
app.use('/expert_gateway', forwardRequest('EXPERT_SERVICE_NAME'));
app.use('/mcq_gateway', forwardRequest('MCQ_SERVICE_NAME'));
app.use('/test_gateway', forwardRequest('TEST_SERVICE_NAME'));
app.use('/testcase_gateway', forwardRequest('TESTCASE_SERVICE_NAME'));
app.use('/coding_gateway', forwardRequest('CODING_SERVICE_NAME'));
app.use('/attendance_gateway', forwardRequest('ATTENDANCE_SERVICE_NAME'));
app.use('/certificates_gateway', forwardRequest('CERTIFICATES_SERVICE_NAME'));
app.use('/overall_gateway', forwardRequest('INDIVIDUAL_SERVICE_NAME'));
app.use('/individual_gateway', forwardRequest('OVERALL_SERVICE_NAME'));
app.use('/results_gateway', forwardRequest('RESULTS_SERVICE_NAME'));
app.use('/user_gateway', forwardRequest('USER_SERVICE_NAME'));
app.use('/modules_gateway', forwardRequest('MODULES_SERVICE_NAME'));
app.use('/organization_gateway', forwardRequest('ORGANIZATION_SERVICE_NAME'));

// Start the API Gateway
app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
});
