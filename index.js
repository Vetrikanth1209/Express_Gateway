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
        const url = `https://${CONSUL_HOST}:${CONSUL_PORT}/v1/catalog/service/${requestedService}`;
        const response = await axios.get(url);

        if (!response.data || response.data.length === 0) {
            throw new Error(`Service '${requestedService}' not registered in Consul`);
        }

        const foundService = response.data[0]; // Pick the first instance
        const serviceUrl = `http://${foundService.ServiceAddress || foundService.Address}:${foundService.ServicePort}`;

        console.log(`✅ Fetched service URL for ${requestedService}: ${serviceUrl}`);
        return serviceUrl;
    } catch (error) {
        throw new Error(`❌ Error fetching service details for ${requestedService}: ${error.message}`);
    }
};

// Middleware to forward requests to the respective microservices
const forwardRequest = (serviceName) => {
    return async (req, res) => {
        try {
            if (isPublic) {
                console.log(`🔄 Forwarding request to ${serviceName} service...`);

                // Fetch service URL from Consul
                const serviceUrl = await fetchingService(serviceName);

                // Forward the request to the actual service
                const serviceResponse = await axios({
                    method: req.method,
                    url: serviceUrl + req.url, // Append the original path
                    headers: req.headers,
                    data: req.body,
                });

                // Send the service's response back to the client
                res.status(serviceResponse.status).json(serviceResponse.data);
            } else {
                res.status(403).json({ error: 'Service access is restricted' });
            }
        } catch (error) {
            console.error(`❌ Error forwarding request to ${serviceName}:`, error.message);
            res.status(500).json({ error: error.message });
        }
    };
};

// Define API gateways for each service
app.use('/poc_gateway', forwardRequest('POC'));
app.use('/expert_gateway', forwardRequest('EXPERT'));
app.use('/mcq_gateway', forwardRequest('MCQ'));
app.use('/test_gateway', forwardRequest('TEST'));
app.use('/testcase_gateway', forwardRequest('TESTCASE'));
app.use('/coding_gateway', forwardRequest('CODING'));
app.use('/attendance_gateway', forwardRequest('ATTENDANCE'));
app.use('/certificates_gateway', forwardRequest('CERTIFICATES'));
app.use('/overall_gateway', forwardRequest('OVERALL'));
app.use('/individual_gateway', forwardRequest('INDIVIDUAL'));
app.use('/results_gateway', forwardRequest('RESULTS'));
app.use('/user_gateway', forwardRequest('USER'));
app.use('/modules_gateway', forwardRequest('MODULES'));
app.use('/organization_gateway', forwardRequest('ORGANIZATION'));

// Start the API Gateway
app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
});
