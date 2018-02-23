var express = require('express'),
    bodyParser = require('body-parser'),
    twitter = require('./twitter'),
    assert = require('assert'),
    ObjectID = require('mongodb').ObjectID

var allTrackers = {}
var allKeywords = new Set()

async function newTracker(req, res, db) {
    let words_to_track = req.body.words_to_track
    if (words_to_track === undefined || words_to_track.length === 0) {
        res.status(400).json({
            message: 'What to track?',
        })
        return
    }

    any_word_is_empty = false
    for (let word of words_to_track) {
        any_word_is_empty = any_word_is_empty || (word.length === 0)
    }
    if (any_word_is_empty) {
        res.status(400).json({
            message: 'What to track?',
        })
        return
    }

    for (let word of words_to_track) {
        if (allKeywords.has(word)) {
            res.status(400).json({
                message: 'This is already under consideration',
            })
            return
        }
    }

    for (let word of words_to_track) {
        allKeywords.add(word)
    }

    let tracker = await db.collection('trackers').insertOne({
        words: words_to_track,
        isActive: true
    })

    allTrackers[tracker.insertedId] = {
        stream: twitter.setupStream(
            tracker.insertedId,
            words_to_track,
        ),
        words: words_to_track
    }

    res.json({
        id: tracker.insertedId
    })
}

async function removeTracker(req, res, db) {
    let trackerId = req.body.trackerId
    if (trackerId === undefined || allTrackers[trackerId] === undefined) {
        res.status(400).send({
            message: 'Invalid tracker id'
        })
        return
    }

    let r = await db.collection('trackers').updateOne(
        { _id: new ObjectID(trackerId) },
        { $set: { isActive: false } }, 
    )
    assert(1, r.updatedCount)

    for (let word of allTrackers[trackerId].words) {
        allKeywords.delete(word)
    }

    allTrackers[trackerId].stream.stop()
    delete allTrackers[trackerId]

    res.json({
        message: 'Removed tracker'
    })
    console.log(allKeywords)
}

async function listTrackers(req, res, db) {
    let response = {}
    Object.keys(allTrackers).forEach((key) => {
        response[key] = allTrackers[key].words
    })

    res.json(response)
}

function isTrackerKnown(trackerId) {
    return allTrackers.trackerId !== undefined
}

async function setupKnownStreams(db) {
    let cursor = await db.collection('trackers').find({isActive: true})
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        if (!isTrackerKnown(doc._id)) {
            stream = twitter.setupStream(doc._id, doc.words, db)
            allTrackers[doc._id] = {
                stream: stream,
                words: doc.words
            }
        }
        for (let word of doc.words) {
            allKeywords.add(word)
        }
    }
    console.log(allKeywords)
}

module.exports = {
    allTrackers,
    newTracker,
    isTrackerKnown,
    setupKnownStreams,
    removeTracker,
    listTrackers
}