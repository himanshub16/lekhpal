var MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    express = require('express'),
    bodyParser = require('body-parser'),
    twitter = require('./twitter'),
    trackers = require('./trackers'),
    json2csv = require('json2csv').parse

var app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const default_page_size = Number(process.env.PAGE_SIZE)

async function setup_database() {
    let db = (await MongoClient.connect(process.env.DB_URL)).db(process.env.DB_NAME)
    return db
}

function setup_routes(db) {

    app.get('/', (req, res) => {
        res.sendFile(`${__dirname}/index.html`)
    })

    app.post('/add_tracker', (req, res) => {
        trackers.newTracker(req, res, db)
    })

    app.delete('/remove_tracker', (req, res) => {
        trackers.removeTracker(req, res, db)
    })

    app.get('/list_trackers', (req, res) => {
        trackers.listTrackers(req, res, db)
    })

    app.post('/find', async (req, res) => {
        let format = req.body.format
        let query = req.body.query

        let page_no = (req.body.page_no === undefined) ? 1 : (req.body.page_no)
        let page_size = (req.body.page_size === undefined) ? default_page_size : req.body.page_size
        let projection = (req.body.projection === undefined) ? {} : req.body.projection

        if (format === undefined) {
            res.status(400).json({
                message: 'Missing format or query'
            })
            return
        }

        let tweets = await twitter.searchTweets(query, projection, db, page_no, page_size)
        if (format == 'json') {
            res.json(tweets)
        } else if (format == 'csv') {
            res.set('Content-Type', 'application/octet-stream')
            res.send(new Buffer(json2csv(tweets, { flatten: true })))
        }
    })
}

async function main() {
    let db = await setup_database()
    trackers.setupKnownStreams(db)
    setup_routes(db)
    app.listen(5000)
}


main()