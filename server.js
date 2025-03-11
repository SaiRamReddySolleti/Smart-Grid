const express = require('express');
const bodyParser = require('body-parser');
const { User, Data }= require('./models/user');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { createServer } = require('http');
const cors = require('cors');
const path = require('path');

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cors());

const uri = "mongodb+srv://Uday:MjjJ700NYlGsgSPd@cluster0.q2srzww.mongodb.net/?retryWrites=true&w=majority";

let client;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const server = createServer(app);
const port = process.env.PORT || 3000;

server.listen(port, async () => {
    console.log(`Server started on port ${port}`);
    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    try {
        await client.connect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    await client.close();
    process.exit(0);
});

const session = require('express-session');

app.use(session({
    secret: '35900b97094c8f7b886f67ba535c298c32ba8bb5a507d66c8f3ce15d38fd1b5b3615c5221deb6201e2667fb9bbd21089555a6fd6170bdb1a8bcc36de51c8bdb1',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false} // set to true if you're using https
}));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html'); // Send index.html file
});
app.post('/register', async (req, res) => {
    try {
        const database = client.db('SIH-SG');
        const users = database.collection('users');
        const newUser = {
            userId: req.body.userid,
            role: req.body.role,
            username: req.body.username,
            password: req.body.password
        };
        const result = await users.insertOne(newUser);
        res.sendFile(__dirname + '/index.html');
    } catch (err) {
        console.error(err);  // Log the error to the console
        res.status(500).send('Error registering user');
    }
});

async function getConsumptionData(userId, role, range) 
{
    const database = client.db('SIH-SG');
    const collection = database.collection('data');

    let startDate;
    const endDate = new Date();
    

    switch (range) {
        case 'day':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate = new Date();
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'year':
            startDate = new Date();
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
    }
    let consumptionData;
    if (role === 'admin') {
        consumptionData = await collection.aggregate([
            { $match: { date: { $gte: startDate.toISOString().split('T')[0], $lte: endDate.toISOString().split('T')[0] } } },
            { $group: { _id: "$date", total: { $sum: "$use[kw]" } } },
            { $sort: { _id: 1 } } // Add this line to sort by date
        ]).toArray();
        return consumptionData.map(item => ({ date: item._id, value: item.total || item['use[kw]']}));

// and similarly for generationData
    } else {
        consumptionData = await collection.find({
            "userid": userId,
            "date": {
                "$gte": startDate.toISOString().split('T')[0],
                "$lte": endDate.toISOString().split('T')[0]
            },
            "use[kw]": { "$exists": true }
        }, {"use[kw]": 1, "_id": 0}).toArray();
        return consumptionData.map(item => ({ date: item.date, value: item.total || item['use[kw]']}));
}
    }

async function getGenerationData(userId, role, range) {
    // ... existing code ...
    const database = client.db('SIH-SG');
    const collection = database.collection('data');

    let startDate;
    const endDate = new Date();
    

    switch (range) {
        case 'day':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate = new Date();
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'year':
            startDate = new Date();
            startDate.setMonth(0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
    }

    let generationData;
    if (role === 'admin') {
        generationData = await collection.aggregate([
            { $match: { date: { $gte: startDate.toISOString().split('T')[0], $lte: endDate.toISOString().split('T')[0] } } },
            { $group: { _id: "$date", total: { $sum: "$gen[kw]" } } },
            { $sort: { _id: 1 } } // Add this line to sort by date
        ]).toArray();
        return generationData.map(item => ({ date: item._id, value: item.total || item['gen[kw]']}));

// and similarly for generationData
    } else {
        generationData = await collection.find({
            "userid": userId,
            "date": {
                "$gte": startDate.toISOString().split('T')[0],
                "$lte": endDate.toISOString().split('T')[0]
            },
            "gen[kw]": { "$exists": true }
        }, {"gen[kw]": 1, "_id": 0}).toArray();
        return generationData.map(item => ({ date: item.date, value: item.total || item['gen[kw]']}));
    }
    
}
app.post('/fetchData', async (req, res) => {
    try {
        const userId = req.body.userId; // Get the user ID from the request body
        const role = req.body.role; // Get the role from the request body
        const view = req.body.view; // Get the view from the request body

        // Fetch the consumption and generation data
        const consumptionData = await getConsumptionData(userId, role, view);
        const generationData = await getGenerationData(userId, role, view);

        // Send the data to the client
        //console.log({ consumptionData, generationData });
        res.json({ consumptionData, generationData });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});


app.post('/login', async (req, res) => {
    try {
        const database = client.db('SIH-SG');
        const users = database.collection('users');
        const user = await users.findOne({ role: req.body.role, userid: req.body.userid, password: req.body.password });
        if (!user) {
            res.status(401).send('Invalid username or password');
        } else {
            req.session.userId = user.userId;
            req.session.role = user.role;
            if (user.role === 'admin') {
                res.redirect('/adash'); // Redirect to adash if the user is an admin
            } else {
                res.redirect('/udash'); // Redirect to udash otherwise
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal server error');
    }
});
app.get('/udash', (req, res) => {
    try {
        res.render('udash', { role: req.session.role, userId: req.session.userId });
    } catch (err) {
        console.error('Error rendering udash:', err);
        res.status(500).send('Internal server error');
    }
});

app.get('/adash', (req, res) => {
    try {
        res.render('adash', { role: req.session.role, userId: req.session.userId });
    } catch (err) {
        console.error('Error rendering adash:', err);
        res.status(500).send('Internal server error');
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return console.log(err);
        }
        res.redirect('/index.html');
    });
});

module.exports = server;

