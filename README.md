# Lekhpal

Lekhpal monitors Twitter for certain filters and catalogs the result in a MongoDB database.
It provides a ReST API to add/remove trackers, which are custom set of keywords to monitor, and query the result back.

## Features
* **ReSTful** and **stateless** handling of keywords to monitor Twitter for.
* API on initialization, starts monitoring for keywords where you last left it.
* Delete keyword to stop monitoring via ReST.
* Query tweets stored in database.
* Paginated API to limit large amount of data.
* Download as **JSON/CSV** supported.

## Technical aspects
* Uses Twitter's streaming API
* MongoDB database as JSON store and for efficient query.
* NodeJS to have an efficient asynchronous implementation.