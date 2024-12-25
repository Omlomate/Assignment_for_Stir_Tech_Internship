const { Builder, By, Key, until } = require('selenium-webdriver');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();


// MongoDB schema and model setup
mongoose.connect('mongodb://localhost:27017/twitterTrends', { useNewUrlParser: true, useUnifiedTopology: true });
const trendSchema = new mongoose.Schema({
    uniqueId: String,
    trends: [String],
    dateTime: Date,
    ipAddress: String
});
const Trend = mongoose.model('Trend', trendSchema);

// ProxyMesh credentials
const PROXY_URL = 'http://omlomate:LcMVbNZ4mzCgAG.@us-ca.proxymesh.com:31280';

// Extract the proxy IP from the ProxyMesh URL (static IP in this case)
const ipAddress = PROXY_URL.split('@')[1].split(':')[0]; // Extracted IP from the proxy URL

async function loginToTwitter(driver, username, emailOrPhone, password) {
    console.log("Step 1: Navigating to Twitter login page...");
    await driver.get('https://twitter.com/login');

    console.log("Step 2: Waiting for the username/email field to appear...");
    const usernameField = await driver.wait(until.elementLocated(By.name('text')), 10000);

    console.log("Step 3: Entering username/email...");
    await usernameField.sendKeys(username, Key.RETURN);

    console.log("Step 4: Checking for the phone/email confirmation step...");
    try {
        const phoneOrEmailField = await driver.wait(
            until.elementLocated(By.css('input[data-testid="ocfEnterTextTextInput"]')),
            5000
        );
        console.log("Step 5: Entering phone/email...");
        await phoneOrEmailField.sendKeys(emailOrPhone, Key.RETURN);
    } catch (e) {
        console.log("Phone/email step skipped.");
    }

    console.log("Step 6: Waiting for the password field to appear...");
    const passwordField = await driver.wait(until.elementLocated(By.name('password')), 10000);

    console.log("Step 7: Entering password...");
    await passwordField.sendKeys(password, Key.RETURN);

    console.log("Step 8: Waiting for the home page to load...");
    await driver.wait(until.titleContains('Home'), 10000);

    console.log("Step 9: Successfully logged in!");
}

async function fetchTrendingTopics() {
    const uniqueId = uuidv4();
    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions({
            proxy: {
                proxyType: 'manual',
                httpProxy: PROXY_URL,
                sslProxy: PROXY_URL,
            },
        })
        .build();

    try {
        // Login credentials
        const username = process.env.TWITTER_USERNAME;
        const emailOrPhone = process.env.TWITTER_EMAIL_OR_PHONE;
        const password = process.env.TWITTER_PASSWORD;
        

        // Login to Twitter
        await loginToTwitter(driver, username, emailOrPhone, password);

        console.log("Step 10: Navigating to the 'What's Happening' section...");
        await driver.get('https://twitter.com/explore/tabs/trending');

        console.log("Step 11: Waiting for the trending section to load...");
        // Wait for the elements with class 'css-175oi2r' that contain trends
        await driver.wait(until.elementLocated(By.css('div[aria-label="Timeline: Explore"]')), 20000);

        console.log("Step 12: Extracting the top 5 trending topics...");
        // Locate all div elements that match the trend pattern
        const trendElements = await driver.findElements(By.css('div.css-175oi2r span'));

        const top5Trends = [];
        let trendCount = 0;

        for (let i = 0; i < trendElements.length; i++) {
            const trendText = await trendElements[i].getText();
            // Ensure the element contains a valid hashtag and is not empty
            if (trendText && trendText.trim().length > 0 && trendText.startsWith('#') && trendCount < 5) {
                top5Trends.push(trendText);
                trendCount++;
            }
        }

        console.log("Step 13: Saving results to MongoDB...");
        const newTrend = new Trend({
            uniqueId,
            trends: top5Trends,
            dateTime: new Date(),
            ipAddress // Store the extracted proxy IP
        });
        await newTrend.save();

        console.log("Success! Results saved.");
        return { uniqueId, top5Trends, ipAddress };

    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        console.log("Step 15: Closing the browser...");
        await driver.quit();
    }
}

module.exports = fetchTrendingTopics;

// To run the script independently, uncomment the following lines:
// fetchTrendingTopics()
//     .then(results => console.log("Results:", results))
//     .catch(error => console.error("Error:", error));
