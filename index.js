const express = require('express');
require('dotenv').config();
const cors = require('cors');
const axios = require('axios'); // Import axios for HTTP requests
const consul = require('./middleware/consul'); // Import the Consul registration file

const app = express();
const PORT = process.env.PORT || 4000;

// Check if we are in a public environment (e.g., Render or similar)
const isPublic = process.env.IS_PUBLIC === 'true';  // Set this to 'true' in your production environment

app.use(cors());

// Health Check Route for Consul
app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway is healthy' });
});

// Function to fetch the respective service details from Consul
const fetchingService = async (requestedService) => {
    try {
        const response = await axios.get(`https://${process.env.CONSUL_HOST}:${process.env.CONSUL_PORT}/v1/catalog/service/${requestedService}`);
        if (response.data.length === 0) {
            throw new Error(`Requested service '${requestedService}' not registered in Consul`);
        }
        const foundService = response.data[0];
        return `http://${foundService.Address}:${foundService.ServicePort}`;
    } catch (error) {
        throw new Error(`Error fetching service details for ${requestedService}: ${error.message}`);
    }
};

// Middleware to forward requests to the respective microservices (only if public)
const forwardRequest = (serviceName) => {
    return async (req, res, next) => {
        try {
            if (isPublic) {
                // Only forward request if in public environment
                const serviceNameEnv = process.env[`${serviceName}_SERVICE_NAME`];
                if (!serviceNameEnv) {
                    throw new Error(`Environment variable for ${serviceName}_SERVICE_NAME is not defined`);
                }
                const serviceUrl = await fetchingService(serviceNameEnv);
                
                // Make a direct HTTP request to the service
                const serviceResponse = await axios({
                    method: req.method,
                    url: serviceUrl + req.url,
                    headers: req.headers,
                    data: req.body,
                });

                // Send the response from the service to the client
                res.status(serviceResponse.status).json(serviceResponse.data);
            } else {
                // For internal use, handle the request directly
                console.log(`Direct request to ${serviceName} service`);
                res.status(200).json({ message: `Direct access to ${serviceName} service` });
            }
        } catch (error) {
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
    console.log(`API Gateway running on port ${PORT}`);
});
