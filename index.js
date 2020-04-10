const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const { MongoClient } = require('mongodb')
const schedule = require('node-schedule')
require('dotenv').config()

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static('Public'))

//Setting view engine
app.set('view engine', 'ejs')

//DB connection
const client = new MongoClient(process.env.URI, { useUnifiedTopology : true })
client.connect((err) => {
    if(err) {
        console.log('Connection to DB unsuccessful')
        console.log(err)
    }
    console.log('Connection to DB successful')
    db = client.db('stats-king')
})

app.get('/', (req, res) => {
    db.collection('playerLeaderboard').find({ id : 'global' }).toArray((err, docs) => {
        if(err) console.log(err)
        db.collection('clanLeaderboard').find({ id : 'global' }).toArray((err, docs2) => {
            if(err) console.log(err)
            res.render('home', { players : docs[0].playerLeaderboard.slice(0, 10), clans : docs2[0].clanLeaderboard.slice(0, 10)})
        })
    })
})

app.get('/leaderboards', (req, res) => {
    if(req.query.type && req.query.locationid) {
        type = req.query.type
        locationid = req.query.locationid
    }
    else  {
        type = 'players'
        locationid = 'global'
    }
    if(type == 'players') {
        if(locationid != 'global') {
            db.collection('playerLeaderboard').find({ id : parseInt(locationid) }).toArray((err, docs) => {
                if(err) console.log(err)
                res.render('leaderboardplayer', { players : docs[0].playerLeaderboard, location : docs[0].name, value : docs[0].id })
            })
        }
        else {
            db.collection('playerLeaderboard').find({ id : locationid }).toArray((err, docs) => {
                if(err) console.log(err)
                res.render('leaderboardplayer', { players : docs[0].playerLeaderboard, location : docs[0].name, value :  'global' })
            })
        }
    }
    else if(type == 'clans') {
        if(locationid != 'global') {
            db.collection('clanLeaderboard').find({ id : parseInt(locationid) }).toArray((err, docs) => {
                if(err) console.log(err)
                res.render('leaderboardclan', {clans : docs[0].clanLeaderboard, location : docs[0].name, value : docs[0].id })
            })
        }
        else {
            db.collection('clanLeaderboard').find({ id : locationid }).toArray((err, docs) => {
                if(err) console.log(err)
                res.render('leaderboardclan', {clans : docs[0].clanLeaderboard, location : docs[0].name, value : 'global' })
            })
        }
    }
    else {
        if(locationid != 'global') {
            db.collection('clanwarLeaderboard').find({ id : parseInt(locationid)}).toArray((err, docs) => {
                if(err) console.log(err)
                res.render('leaderboardclanwar', {clans : docs[0].clanwarLeaderboard, location : docs[0].name, value : docs[0].id })
            })
        }
        else {
            db.collection('clanwarLeaderboard').find({ id : locationid }).toArray((err, docs) => {
                if(err) console.log(err)
                res.render('leaderboardclanwar', {clans : docs[0].clanwarLeaderboard, location : docs[0].name, value : 'global' })
            })
        }
    }
})

app.get('/search', (req, res) => {
    if(req.query.type && req.query.tag) {
        if(req.query.type == 'player') {    
            db.collection('players').find({ tag : '#'+req.query.tag}).toArray((err, docs) => {
                if(err) console.log(err)
                if(typeof docs === 'undefined' || docs.length == 0) {
                    fetch('https://api.clashroyale.com/v1/players/%23'+req.query.tag, {
                        headers : {
                            'Authorization' : `Bearer ${process.env.TOKEN}`
                        }
                    })
                        .then(response => response.json())
                        .then(response => {
                            if(typeof response.tag === 'undefined') {
                                res.render('search', { found : false })
                            }
                            else {
                                db.collection('players').insertOne(response,(err, r) => {
                                    if(err) console.log(err)
                                })
                                fetch('https://api.clashroyale.com/v1/players/%23'+req.query.tag+'/battlelog', { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
                                    .then(response => response.json())
                                    .then(response => {
                                        if(typeof response.reason === 'undefined') {
                                            db.collection('playersBattlelog').insertOne({ "tag" : '#'+req.query.tag, 'battlelog' : response}, (err, r) => {
                                                if(err) console.log(err)
                                                fetch('https://api.clashroyale.com/v1/players/%23'+req.query.tag+'/upcomingchests', { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
                                                    .then(response => response.json())
                                                    .then(response => {
                                                        if(typeof response.reason === 'undefined')
                                                            db.collection('playersUpcomingchests').insertOne({ "tag" : '#'+req.query.tag, 'items' : response.items}, (err, r) => {
                                                                if(err) console.log(err)
                                                                res.redirect('http://localhost:4000/player/' + req.query.tag)
                                                            })
                                                    })
                                                    .catch((err) => console.log(err))
                                            })  
                                            
                                        }
                                    })
                                    .catch((err) => console.log(err))
                            }
                        })
                        .catch(err => console.log(err))
                }
                else {
                    res.redirect('http://localhost:4000/player/' + req.query.tag)
                }
            })
        }
        else if(req.query.type == 'clan') {
            db.collection('clans').find({ tag : '#'+req.query.tag}).toArray((err, docs) => {
                if(err) console.log(err)
                if(typeof docs === 'undefined'  || docs.length == 0) {
                    fetch('https://api.clashroyale.com/v1/clans/%23'+req.query.tag, {
                        headers : {
                            'Authorization' : `Bearer ${process.env.TOKEN}`
                        }
                    })
                        .then(response => response.json())
                        .then(response => {
                            if(typeof response.tag === 'undefined') {
                                fetch('https://api.clashroyale.com/v1/clans?name='+req.query.tag, {
                                    headers : {
                                        'Authorization' : `Bearer ${process.env.TOKEN}`
                                    }
                                })
                                    .then(response => response.json())
                                    .then(response => {
                                        if(typeof response.items === 'undefined') {
                                            res.render('search', { found : false })
                                        }
                                        else {
                                            if(response.items.length == 0) {
                                                res.render('search', { found : false })
                                            }
                                            else {
                                                res.render('search', { found : true, results : response.items, text : req.query.tag })
                                            }
                                        }
                                    })
                                    .catch((err) => console.log(err))
                            }
                            else {
                                res.redirect('http://localhost:4000/clan/' + req.query.tag)
                            }
                        })
                        .catch((err) => console.log(err))
                }
                else {
                    res.redirect('http://localhost:4000/clan/' + req.query.tag)
                }
            })
        }
        else {
            res.redirect('http://localhost:4000')
        }
    }
    else {
        res.redirect('http://localhost:4000')
    }
})

app.get('/player/:tag', (req, res) => {
        db.collection('players').find({ 'tag' : '#'+req.params.tag }).toArray((err, docs) => {
            if(err) console.log(err)
            if(typeof docs === 'undefined' || docs.length == 0) {
                res.redirect('http://localhost:4000/search?type=player&tag='+req.params.tag)
            }
            else {
                db.collection('playersUpcomingchests').find({ tag : '#'+req.params.tag }).toArray((err, docs2) => {
                    if(err) console.log(err)
                    db.collection('playersBattlelog').find({ tag : '#'+req.params.tag }).toArray((err, docs3) => {
                        if(err) console.log(err)
                        res.render('player', { player : docs[0], upcoming : docs2[0].items, log : docs3[0].battlelog.slice(0, 10)})
                    })
                })
            }
        })
})

app.post('/refresh/player/:tag', (req, res) => {
    db.collection('players').find({ 'tag' : '#'+req.params.tag }).toArray((err, docs) => {
        if(err) console.log(err)
        if(typeof docs[0] !== 'undefined' || docs.length != 0) {
            fetch('https://api.clashroyale.com/v1/players/%23'+req.params.tag, { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
                .then(r => r.json())
                .then(r => {  
                    if(typeof r.reason === 'undefined') {
                        fetch('https://api.clashroyale.com/v1/players/%23'+req.params.tag+'/battlelog',{ headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
                            .then(r2 => r2.json())
                            .then(r2 => {
                                if(typeof r2.reason === 'undefined') {
                                    fetch('https://api.clashroyale.com/v1/players/%23'+req.params.tag+'/upcomingchests',{ headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
                                        .then(r3 => r3.json())
                                        .then(r3 => {
                                            if(typeof r3.reason === 'undefined') {
                                                db.collection('players').replaceOne({ 'tag' : '#'+req.params.tag }, r)
                                                db.collection('playersUpcomingchests').updateOne({ 'tag' : '#'+req.params.tag }, {$set : { 'items' : r3.items }})
                                                db.collection('playersBattlelog').updateOne({ 'tag' : '#'+req.params.tag }, {$set : { 'battlelog' : r2 }})
                                                    .then(r => {
                                                        res.json({ success : true })
                                                    })
                                                    .catch(err => console.log(err))
                                            }
                                            else 
                                                res.json({success:false})
                                        })
                                        .catch((err) => console.log(err))
                                }
                                else {
                                    res.json({success:false})
                                }
                            })
                            .catch((err) => console.log(err))
                    }
                    else {
                        res.json({success:false})
                    }
                })
                .catch((err) => console.log(err))
        }
        else {
            res.json({success:false})
        }
    })
})

app.get('/clan/:tag', (req, res) => {
    db.collection('clans').find({'tag' : '#'+req.params.tag}).toArray((err, doc) => {
        if(err) console.log(err)
        if(doc.length == 0 || typeof doc[0] === 'undefined'){
            fetch('https://api.clashroyale.com/v1/clans/%23'+req.params.tag, { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}` }})
                .then(r6 => r6.json())
                .then(r6 => {
                    if(typeof r6.reason === 'undefined') {
                        fetch('https://api.clashroyale.com/v1/clans/%23'+req.params.tag+'/members', { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
                            .then(r2 => r2.json())
                            .then(r2 => {
                                if(typeof r2.reason === 'undefined') {
                                    fetch('https://api.clashroyale.com/v1/clans/%23'+req.params.tag+'/warlog', { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
                                        .then(r3 => r3.json())
                                        .then(r3 => {
                                            if(typeof r3.reason === 'undefined') {
                                                fetch('https://api.clashroyale.com/v1/clans/%23'+req.params.tag+'/currentwar', { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}` }})
                                                    .then(r4 => r4.json())
                                                    .then(r4 => {
                                                        if(typeof r4.reason === 'undefined') {
                                                            db.collection('clans').insertOne(r6,(err, r) => { 
                                                                if(err) console.log(err) 
                                                                db.collection('clansMembers').insertOne({ 'tag' : '#'+req.params.tag, 'members' : r2.items},(err, r) => {
                                                                    if(err) console.log(err)
                                                                    db.collection('clansCurrentwar').insertOne({ 'tag' : '#'+req.params.tag, 'currentwar' : r4},(err, r) => {
                                                                        if(err) console.log(err)
                                                                        db.collection('clansWarlog').insertOne({ 'tag' : '#'+req.params.tag, 'warlog' : r3.items})
                                                                            .then(rez => {
                                                                                res.render('clan',{clan : r6, members : r2.items, warlog : r3.items, currentwar : r4})
                                                                            })
                                                                            .catch(err => console.log(err))
                                                                    })
                                                                })
                                                            })  
                                                        }
                                                        else
                                                            res.render('search',{ found : false })
                                                    })
                                                    .catch((err) => console.log(err))
                                            }
                                            else 
                                                res.render('search',{ found : false })
                                        })
                                        .catch((err) => console.log(err))
                                }
                                else 
                                    res.render('search',{ found : false })
                            })
                            .catch((err) => console.log(err))
                    }
                    else
                        res.render('search',{ found : false })
                })
                .catch((err) => console.log(err))
        }
        else {
            db.collection('clansMembers').find({ 'tag' : '#'+req.params.tag }).toArray((err, doc2) => {
                db.collection('clansWarlog').find({ 'tag' : '#'+req.params.tag }).toArray((err, doc3) => {
                    db.collection('clansCurrentwar').find({ 'tag' : '#'+req.params.tag }).toArray((err, doc4) => { 
                        res.render('clan',{clan:doc[0], members : doc2[0].members, warlog : doc3[0].warlog, currentwar : doc4[0].currentwar})
                    })
                })
            })
        }
    })
})

app.post('/refresh/clan/:tag', (req, res) => {
    db.collection('clans').find({ 'tag' : '#'+req.params.tag }).toArray((err, doc) => {
        if(err) console.log(err)
        if(typeof doc !== 'undefined' || doc.length != 0) {
            fetch('https://api.clashroyale.com/v1/clans/%23'+req.params.tag, { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
                .then(r => r.json())
                .then(r => {
                    if(typeof r.reason === 'undefined') {
                        fetch('https://api.clashroyale.com/v1/clans/%23'+req.params.tag+'/members', { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
                            .then(r2 => r2.json())
                            .then(r2 => {
                                if(typeof r2.reason === 'undefined') {
                                    fetch('https://api.clashroyale.com/v1/clans/%23'+req.params.tag+'/warlog', { headers : {'Authorization' : `Bearer ${process.env.TOKEN}`}})
                                        .then(r3 => r3.json())
                                        .then(r3 => {
                                            if(typeof r3.reason === 'undefined'){
                                                fetch('https://api.clashroyale.com/v1/clans/%23'+req.params.tag+'/currentwar', { headers : {'Authorization' : `Bearer ${process.env.TOKEN}`}})
                                                    .then(r4 => r4.json())
                                                    .then(r4 => {
                                                        if(typeof r4.reason === 'undefined') {
                                                            db.collection('clans').replaceOne({ 'tag' : '#'+req.params.tag }, r)
                                                            db.collection('clansMembers').updateOne({ 'tag' : '#'+req.params.tag },{ $set : { 'members' : r2.items}})
                                                            db.collection('clansCurrentwar').updateOne({ 'tag' : '#'+req.params.tag }, { $set : { 'currentwar' : r4 } })
                                                            db.collection('clansWarlog').updateOne({ 'tag' : '#'+req.params.tag }, { $set : { 'warlog' : r3.items }})
                                                                .then(r => {
                                                                    res.json({success:true})
                                                                })
                                                                .catch(err => console.log(err))
                                                        }
                                                        else
                                                            res.json({success:false})
                                                    })
                                                    .catch((err) => console.log(err))
                                            }
                                            else
                                                res.json({success:false})
                                        })
                                        .catch((err) => console.log(err))
                                }
                                else 
                                    res.json({success:false})
                            })
                            .catch((err) => console.log(err))
                    }
                    else
                        res.json({success:false})
                })
                .catch((err) => console.log(err))
        }
        else 
            res.json({success:false})
    })
})

app.get('/tournaments', (req, res) => {
    fetch('https://api.clashroyale.com/v1/globaltournaments', { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
        .then(r => r.json())
        .then(r => {
            if(typeof r.reason === 'undefined' && r.items.length != 0) {
                res.render('tournament', { empty : false, items : r.items })
            }
            else {
                res.render('tournament', { empty : true })
            }
        })
})

app.get('/tournaments/search', (req, res) => {
    if(typeof req.query.name !=='undefined') {
        if(req.query.name != '')
            fetch('https://api.clashroyale.com/v1/tournaments?name='+req.query.name, { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
                .then(r => r.json())
                .then(r => {
                    if(typeof r.reason === 'undefined' && r.items.length != 0 ) {
                        res.render('tournysearch', { empty : false, tournys : r.items, name : req.query.name })
                    }
                    else {
                        res.render('tournysearch', { empty : true, name : req.query.name })
                    }
                })
                .catch((err) => console.log(err))
        else
            res.render('tournysearch', { empty : true, name : req.query.name })    
    }    
    else
        res.redirect('http://localhost:4000/tournaments')
})

app.get('/about', (req, res) => {
    res.render('about')
})

var location = [
    { "id" :"global" }, { "id" :57000007 }, { "id" :57000008 }, { "id" :57000009 }, { "id" :57000010 }, { "id" :57000011 }, { "id" :57000012 }, { "id" :57000013 }, { "id" :57000014 }, { "id" :57000015 }, { "id" :57000016 }, { "id" :57000017 }, { "id" :57000018 }, { "id" :57000019 }, { "id" :57000020 }, { "id" :57000021 }, { "id" :57000022 }, { "id" :57000023 }, { "id" :57000024 }, { "id" :57000025 }, { "id" :57000026 }, { "id" :57000027 }, { "id" :57000028 }, { "id" :57000029 }, { "id" :57000030 }, { "id" :57000031 }, { "id" :57000032 }, { "id" :57000033 }, { "id" :57000034 }, { "id" :57000035 }, { "id" :57000036 }, { "id" :57000037 }, { "id" :57000038 }, { "id" :57000039 }, { "id" :57000040 }, { "id" :57000041 }, { "id" :57000042 }, { "id" :57000043 }, { "id" :57000044 }, { "id" :57000045 }, { "id" :57000046 }, { "id" :57000047 }, { "id" :57000048 }, { "id" :57000049 }, { "id" :57000050 }, { "id" :57000051 }, { "id" :57000052 }, { "id" :57000053 }, { "id" :57000054 }, { "id" :57000055 }, { "id" :57000056 }, { "id" :57000057 }, { "id" :57000058 }, { "id" :57000059 }, { "id" :57000060 }, { "id" :57000061 }, { "id" :57000062 }, { "id" :57000063 }, { "id" :57000064 }, { "id" :57000065 }, { "id" :57000066 }, { "id" :57000067 }, { "id" :57000068 }, { "id" :57000069 }, { "id" :57000070 }, { "id" :57000071 }, { "id" :57000072 }, { "id" :57000073 }, { "id" :57000074 }, { "id" :57000075 }, { "id" :57000076 }, { "id" :57000077 }, { "id" :57000078 }, { "id" :57000079 }, { "id" :57000080 }, { "id" :57000081 }, { "id" :57000082 }, { "id" :57000083 }, { "id" :57000084 }, { "id" :57000085 }, { "id" :57000086 }, { "id" :57000087 }, { "id" :57000088 }, { "id" :57000089 }, { "id" :57000090 }, { "id" :57000091 }, { "id" :57000092 }, { "id" :57000093 }, { "id" :57000094 }, { "id" :57000095 }, { "id" :57000096 }, { "id" :57000097 }, { "id" :57000098 }, { "id" :57000099 }, { "id" :57000100 }, { "id" :57000101 }, { "id" :57000102 }, { "id" :57000103 }, { "id" :57000104 }, { "id" :57000105 }, { "id" :57000106 }, { "id" :57000107 }, { "id" :57000108 }, { "id" :57000109 }, { "id" :57000110 }, { "id" :57000111 }, { "id" :57000112 }, { "id" :57000113 }, { "id" :57000114 }, { "id" :57000115 }, { "id" :57000116 }, { "id" :57000117 }, { "id" :57000118 }, { "id" :57000119 }, { "id" :57000120 }, { "id" :57000121 }, { "id" :57000122 }, { "id" :57000123 }, { "id" :57000124 }, { "id" :57000125 }, { "id" :57000126 }, { "id" :57000127 }, { "id" :57000128 }, { "id" :57000129 }, { "id" :57000130 }, { "id" :57000131 }, { "id" :57000132 }, { "id" :57000133 }, { "id" :57000134 }, { "id" :57000135 }, { "id" :57000136 }, { "id" :57000137 }, { "id" :57000138 }, { "id" :57000139 }, { "id" :57000140 }, { "id" :57000141 }, { "id" :57000142 }, { "id" :57000143 }, { "id" :57000144 }, { "id" :57000145 }, { "id" :57000146 }, { "id" :57000147 }, { "id" :57000148 }, { "id" :57000149 }, { "id" :57000150 }, { "id" :57000151 }, { "id" :57000152 }, { "id" :57000153 }, { "id" :57000154 }, { "id" :57000155 }, { "id" :57000156 }, { "id" :57000157 }, { "id" :57000158 }, { "id" :57000159 }, { "id" :57000160 }, { "id" :57000161 }, { "id" :57000162 }, { "id" :57000163 }, { "id" :57000164 }, { "id" :57000165 }, { "id" :57000166 }, { "id" :57000167 }, { "id" :57000168 }, { "id" :57000169 }, { "id" :57000170 }, { "id" :57000171 }, { "id" :57000172 }, { "id" :57000173 }, { "id" :57000174 }, { "id" :57000175 }, { "id" :57000176 }, { "id" :57000177 }, { "id" :57000178 }, { "id" :57000179 }, { "id" :57000180 }, { "id" :57000181 }, { "id" :57000182 }, { "id" :57000183 }, { "id" :57000184 }, { "id" :57000185 }, { "id" :57000186 }, { "id" :57000187 }, { "id" :57000188 }, { "id" :57000189 }, { "id" :57000190 }, { "id" :57000191 }, { "id" :57000192 }, { "id" :57000193 }, { "id" :57000194 }, { "id" :57000195 }, { "id" :57000196 }, { "id" :57000197 }, { "id" :57000198 }, { "id" :57000199 }, { "id" :57000200 }, { "id" :57000201 }, { "id" :57000202 }, { "id" :57000203 }, { "id" :57000204 }, { "id" :57000205 }, { "id" :57000206 }, { "id" :57000207 }, { "id" :57000208 }, { "id" :57000209 }, { "id" :57000210 }, { "id" :57000211 }, { "id" :57000212 }, { "id" :57000213 }, { "id" :57000214 }, { "id" :57000215 }, { "id" :57000216 }, { "id" :57000217 }, { "id" :57000218 }, { "id" :57000219 }, { "id" :57000220 }, { "id" :57000221 }, { "id" :57000222 }, { "id" :57000223 }, { "id" :57000224 }, { "id" :57000225 }, { "id" :57000226 }, { "id" :57000227 }, { "id" :57000228 }, { "id" :57000229 }, { "id" :57000230 }, { "id" :57000231 }, { "id" :57000232 }, { "id" :57000233 }, { "id" :57000234 }, { "id" :57000235 }, { "id" :57000236 }, { "id" :57000237 }, { "id" :57000238 }, { "id" :57000239 }, { "id" :57000240 }, { "id" :57000241 }, { "id" :57000242 }, { "id" :57000243 }, { "id" :57000244 }, { "id" :57000245 }, { "id" :57000246 }, { "id" :57000247 }, { "id" :57000248 }, { "id" :57000249 }, { "id" :57000250 }, { "id" :57000251 }, { "id" :57000252 }, { "id" :57000253 }, { "id" :57000254 }, { "id" :57000255 }, { "id" :57000256 }, { "id" :57000257 }, { "id" :57000258 }, { "id" :57000259 }, { "id" :57000260 }
]

const updater = (type, x) => {
    fetch('https://api.clashroyale.com/v1/locations/'+location[x].id+'/rankings/'+type+'?limit=500', { headers : { 'Authorization' : `Bearer ${process.env.TOKEN}`}})
        .then(response => response.json())
        .then(response => {
            if(typeof response.items !== 'undefined') {
                if(type == 'clans') {
                    db.collection('clanLeaderboard').find({ 'id' : location[x].id }).updateOne({ $set : {'clanLeaderboard' : response.items }})   
                        .catch((err) => console.log(err))
                }
                else if(type == 'players') {
                    db.collection('playerLeaderboard').find({ 'id' : location[x].id }).updateOne({ $set : {'playerLeaderboard' : response.items }})   
                        .catch((err) => console.log(err))
                }
                else {
                    db.collection('clanwarLeaderboard').find({ 'id' : location[x].id }).updateOne({ $set : {'clanwarLeaderboard' : response.items }})   
                        .catch((err) => console.log(err))
                }
            }
            if((x+1) < locations.length) {
                setTimeout(updater(type, x+1), 7000)
            }
        })
        .catch((err) => console.log(err))
}

// Update leaderboard everyday
// 12 a.m.
var playerLeaderboardsUpdate = schedule.scheduleJob('0 0 * * *',() => {
    updater('players', 0)
})
// 1 a.m.
var clanLeaderboardsUpdate = schedule.scheduleJob('0 1 * * *',() => {
    updater('clans', 0)
})
// 2 a.m.
var clanwarLeaderboardsUpdate = schedule.scheduleJob('0 2 * * *',() => {
    updater('clanwars', 0)
})

// Server start
app.listen(process.env.PORT,() => console.log(`Server has started on port ${process.env.PORT}`))
