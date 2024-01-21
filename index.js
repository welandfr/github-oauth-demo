const express = require('express')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000

// Our main page
app.get("/", (req, res) => {
    if (!req.query.token) {
        return res.send(`
            <h1>OAuth Demo</h1>
            <a href="./auth">Log in using GitHub</a>
        `)
    }

    try {
        const user = jwt.verify(req.query.token, process.env.JWT_SECRET)

        res.send(`
            <h1>OAuth Demo</h1>
            Welcome ${user.name}!
        `)

    } catch (err) {
        console.log(err)
        return res.send(`
            Authorization FAILED
        `)
    }
    
});


app.get("/auth", (req, res) => {
    const params = {
        scope: "read:user", // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
        client_id: process.env.CLIENT_ID // Your GitHub OAuth app ID
    }

    // Encode params to url and redirect to github login
    const urlParams = new URLSearchParams(params).toString();
    res.redirect(`https://github.com/login/oauth/authorize?${urlParams}`);

})

// Endpoint for GitHub's callback request
app.get("/github-callback", async (req, res) => {

    const body = {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code: req.query.code, // github sends this
    };

    try {

        const response = await fetch("https://github.com/login/oauth/access_token", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        })
        
        // Token from github
        const data = await response.json()

        // User data from GitHub
        const responseUser = await fetch("https://api.github.com/user", {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
        })
        const user = await responseUser.json()
        //console.log(user)

        // Create JWT to use for my own purposes
        const token = jwt.sign({
            id: user.id,
            user: user.login,
            name: user.name,
            company: user.company,
        }, process.env.JWT_SECRET, { expiresIn: '1h' })

        console.log(token)

        res.redirect(`/?token=${token}`);

    } catch (err) {
        console.log(err)
        res.status(500).json({ err: err.message })
    }

});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});