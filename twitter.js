var Twit = require('twit')

var twitter = new Twit({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
})

var trackers = {}

function restructureTweet(tweet, trackerId) {
    let newTweet = {
        tracker_id: trackerId,
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        source: tweet.source.split('>')[1].split('<')[0].trim(),
        in_reply_to_status_id: tweet.in_reply_to_status_id,
        in_reply_to_user_id: tweet.in_reply_to_user_id,
        in_reply_to_screen_name: tweet.in_reply_to_screen_name,
        stats: {
            quote: tweet.quote_count,
            reply: tweet.reply_count,
            retweet: tweet.retweet_count,
            favorite: tweet.favorite_count
        },
        favorited: tweet.favorited,
        retweeted: tweet.retweeted,
        lang: tweet.lang,
        user: {
            id: tweet.user.id,
            name: tweet.user.name,
            screen_name: tweet.user.screen_name,
            location: tweet.user.location,
            verified: tweet.user.verified,
            followers_count: tweet.user.followers_count,
            friends_count: tweet.user.friends_count,
            favorites_count: tweet.user.favorites_count,
            statuses_count: tweet.user.statuses_count,

        },
        geo: {},
        place: {},
        entities: {
            hashtags: [],
            user_mentions: [],
        }
    }

    if (tweet.geo === null) {
        newTweet.geo = null
    } else {
        newTweet.geo = {
            name: tweet.geo.name,
            full_name: tweet.geo.full_name,
            country_code: tweet.geo.country_code,
            country: tweet.geo.country
        }
    }

    if (tweet.place === null) {
        newTweet.place = null
    } else {
        newTweet.place = {
            name: tweet.place.name,
            full_name: tweet.place.full_name,
            country_code: tweet.place.country_code,
            country: tweet.place.country
        }
    }

    if (tweet.entities.hashtags !== null) {
        newTweet.entities.hashtags = tweet.entities.hashtags.map(each => each.text)
    }

    if (tweet.entities.user_mentions !== null) {
        newTweet.entities.user_mentions = tweet.entities.user_mentions.map(
            (each) => { return {screen_name: each.screen_name, name: each.name}}
        )
    }

    // do the same for retweeted_status
    // no : because the original tweet would have been registered the first time

    return newTweet
}

function setupStream(trackerId, what_to_track, db) {
    var stream = twitter.stream('statuses/filter', {
        track: what_to_track
    })

    stream.on('tweet', function (tweet) {
        let filteredTweet = restructureTweet(tweet, trackerId)
        db.collection('tweets').insertOne(filteredTweet)
        // fs.writeFileSync('./filtered-tweet.json', JSON.stringify(restructureTweet(tweet, trackerId), null, 4), { flag: 'a' })
        // fs.writeFileSync('./unfiltered-tweet.json', JSON.stringify(tweet, null, 4), { flag: 'a' })
        console.log('stream : new for', trackerId)
    })

    stream.on('connect', () => { console.log('twitter: attempting to connect') })
    stream.on('connected', () => { console.log('twitter: connected') })
    stream.on('reconnect', () => { console.log('twitter: attempting to reconnect') })
    stream.on('disconnect', () => { console.log('twitter: disconnecting') })
    stream.on('limit', () => { console.log('twitter: rate limit hit') })

    return stream
}

async function searchTweets(query, projection, db, page_no, page_size) {
    try {
        let result = []
        let cursor = await db.collection('tweets').find(query, {
            projection: projection,
            limit: page_size,
            skip: page_no * page_size
        })
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            doc._id = String(doc._id)
            doc.tracker_id = String(doc.tracker_id)
            result.push(doc)
        }
        return result
    } catch (e) {
        console.log('things failed badly', e)
        return null
    }
}

module.exports = {
    setupStream,
    searchTweets
}