// import fetch from 'node-fetch'
const express = require('express');

// const fetch = require('node-fetch')
const redis = require('redis');
const axios = require('axios');

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// connect redis
const client = redis.createClient({
    host: 'localhost',
    port: REDIS_PORT
});
client.on('error', (err) => console.log('Redis Client Error', err));
client.connect();

const app = express();

// Set response
async function setResponse(username, repos) {
    return `<h2>${username} has ${repos} github repose</h2>`
}

// Make request to github for data
async function getRepos(req, res, next) {
    try { 
        console.log('Fetching Data...');

        const { username } = req.params;

        const response = await axios.get(`https://api.github.com/users/${username}`);

        const data = response.data;

        const repos = data.public_repos;

        // Set data to Redis
        await client.setEx(username, 3600, repos)
        res.send(await setResponse(username, repos));
    } catch (err) {
        console.error(err);
        res.status(500);
    }
}

// Cache Middleware
async function cacheMiddleware(req, res, next) {
    const { username } = req.params;
    client.get(username).then( async (data)=>{
        if(data !== null){
            res.send(await setResponse(username, data));
        } else {
            await next();
        }
    }).catch( async (err)=>{
        if(err) { 
            throw err;
        }
    })
}

app.get('/repos/:username', cacheMiddleware, getRepos);

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`);
});