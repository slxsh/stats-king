<br />
<p align="center">
    <img src="https://imgur.com/mrOgCH4.png" alt="Logo" width="80" height="80">


  <p align="center">
    A Statistics Website For Clash Royale
    <br />
  </p>
</p>

 
 
## About The Project 
This website uses official Clash Royale API to fetch stats. Website contains the following features -
* Search players(via tag) and clans(via tag or name)
* Clans, players and clan wars leaderboard for 200+ locations.
* Search tournaments and see current global tournaments.
* Player profile with general stats, upcoming chests, battlelog and cards.
* Clan profile with general stats, members, current war and past wars.
* API caching using MongoDB. Automatic leaderboards update every midnight. All visited players and clans are also cached.

## Built With
* HTML
* CSS
* Jquery
* Express
* MongoDB
* EJS

## Getting Started
* Get an API Token from [Clash Royale website](https://developer.clashroyale.com/#/login)
* Make .env file in root directory and paste this inside
``` 
TOKEN=api-token-here 
URI=mongodb-link-here
PORT=port-here
```
* Clone the repo
* Run these commands
```
npm i
npm start
``` 

## Screenshots
![home](https://imgur.com/5tmZ5Bx.png)
![leaderboards](https://imgur.com/vLu2OZe.png)
![clan](https://imgur.com/uD4xNbY.png)
![player](https://imgur.com/k6zdlBS.png)

## Author
[Imtiaz Alam](https://github.com/slxsh)
