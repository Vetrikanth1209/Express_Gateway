const express = require('express');
require('dotenv').config();
const consul = require('./middleware/consul'); // Import the Consul registration file

const app = express();
const PORT = 4000;

// Health Check Route for Consul
app.get('/health', (req, res) => {
    res.json({ status: 'API Gateway is healthy' });
});

// Function to fetch the respective service details from Consul
const fetchingService = async (requestedService) => {
    try {
        const services = await consul.catalog.service.nodes(requestedService);
        if (services.length === 0) {
            throw new Error(`Requested service '${requestedService}' not registered in Consul`);
        }
        const foundService = services[0];
        return `http://${foundService.Address}:${foundService.ServicePort}`;
    } catch (error) {
        throw new Error(`Error fetching service details for ${requestedService}: ${error.message}`);
    }
};

// Directly contact Consul for the service URL
app.get('/:serviceName/*', async (req, res) => {
    const { serviceName } = req.params;
    const servicePath = req.params[0];
    try {
        const serviceNameEnv = process.env[`${serviceName.toUpperCase()}_SERVICE_NAME`];
        if (!serviceNameEnv) {
            throw new Error(`Environment variable for ${serviceName.toUpperCase()}_SERVICE_NAME is not defined`);
        }
        const serviceUrl = await fetchingService(serviceNameEnv);
        const targetUrl = `${serviceUrl}/${servicePath}`;
        const response = await fetch(targetUrl); // Use fetch or any HTTP library to forward the request
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the API Gateway
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
