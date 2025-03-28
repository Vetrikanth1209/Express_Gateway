const express = require('express');
const consul = require('./middleware/consul'); // Import the Consul registration file
const fetch = require('node-fetch'); // Ensure you have node-fetch installed

const app = express();
const PORT = 4000;

// Consul Configuration (Defined Directly in Code)
const CONSUL_SERVICE_ID = "Express_Gateway";
const CONSUL_SERVICE_NAME = "Express_Gateway";
const CONSUL_HOST = "consul-jz12.onrender.com";
const CONSUL_PORT = 443;

// Microservices Registered in Consul
const SERVICE_NAMES = {
    POC_SERVICE_NAME: "Express_Poc",
    EXPERT_SERVICE_NAME: "Express_Poc",
    MCQ_SERVICE_NAME: "Express_Test",
    TEST_SERVICE_NAME: "Express_Test",
    TESTCASE_SERVICE_NAME: "Express_Test",
    CODING_SERVICE_NAME: "Express_Test",
    ATTENDANCE_SERVICE_NAME: "Express_Report",
    CERTIFICATES_SERVICE_NAME: "Express_Report",
    INDIVIDUAL_SERVICE_NAME: "Express_Report",
    OVERALL_SERVICE_NAME: "Express_Report",
    RESULTS_SERVICE_NAME: "Express_Report",
    USER_SERVICE_NAME: "Express_User",
    MODULES_SERVICE_NAME: "Express_Mod",
    ORGANIZATION_SERVICE_NAME: "Express_Mod"
};

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

// Dynamic Service Lookup
app.get('/:serviceName/*', async (req, res) => {
    const { serviceName } = req.params;
    const servicePath = req.params[0];
    console.log("At loging "+servicePath)

    try {
        // Constructing key dynamically as SERVICE_NAME mapping
        const serviceNameKey = `${serviceName.toUpperCase()}_SERVICE_NAME`;
        const serviceNameEnv = SERVICE_NAMES[serviceNameKey];

        if (!serviceNameEnv) {
            throw new Error(`Service mapping for ${serviceNameKey} is not defined`);
        }

        const serviceUrl = await fetchingService(serviceNameEnv);
        const targetUrl = `${serviceUrl}/${servicePath}`;
        const response = await fetch(targetUrl);
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
