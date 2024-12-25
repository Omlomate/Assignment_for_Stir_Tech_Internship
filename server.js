require('dotenv').config(); // Load .env variables

const express = require('express');
const mongoose = require('mongoose');
const fetchTrendingTopics = require('./fetchTrendingTopics');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const app = express();
const port = 3000;

// MongoDB connection setup
mongoose.connect('mongodb://localhost:27017/twitterTrends', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Trend schema and model setup
const trendSchema = new mongoose.Schema({
    uniqueId: String,
    trends: [String],
    dateTime: Date,
    ipAddress: String
});

const Trend = mongoose.models.Trend || mongoose.model('Trend', trendSchema);

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set the views directory (default is 'views')
app.set('views', path.join(__dirname, 'views'));

// Serve the index page (index.ejs)
app.get('/', (req, res) => {
    res.render('index'); // This will render the 'index.ejs' file from the 'views' folder
});

// Endpoint to fetch and save trending topics
app.post('/run-script', async (req, res) => {
    try {
        // Fetch trending topics from the script (which uses ProxyMesh)
        const { top5Trends } = await fetchTrendingTopics();

        // Get the client's IP address
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Save the trend record to MongoDB
        const newTrend = new Trend({
            uniqueId: uuidv4(),  // Use uuidv4() to generate a unique ID
            trends: top5Trends,
            dateTime: new Date(),
            ipAddress
        });

        await newTrend.save();

        // Return the data and IP address to the client
        const currentDateTime = new Date().toLocaleString();
        res.json({
            uniqueId: newTrend.uniqueId,
            top5Trends,
            ipAddress,
            dateTime: currentDateTime,
            mongoRecord: newTrend
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error running the script');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
