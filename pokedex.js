// Greg VanOrt
// Pokedex:
// This javascript file handles the interaction of the pokemon interface and 
// then maintains the game states. 
"use strict";
(function () {
    // Add a lot of toggle functions
    
    // holds the current game battle id.
    let guid;

    // current pokemon player id.
    let pid;

    // current selected pokemon.
    let currentPokemon;

    // All found and defeated pokemon will be found here.
    let pokedex = ["Bulbasaur", "Charmander", "Squirtle"];

    // This function, given an element id, will return the associated DOM
    // element.
    function $(id) {
        return document.getElementById(id);
    }

    // This function, given a query, this will return the associated DOM
    // element. The provided query must include the exact reference for the
    // element (i.e. #id, .class, button, etc.)
    function qsl(query) {
        return document.querySelector(query);
    }

    // This function, given a query, this will return ALL associated DOM
    // elements. The provided query must include the exact reference for the
    // elements (i.e. #id, .class, button, etc.)
    function qslall(query) {
        return document.querySelectorAll(query);
    }

    // This function will run on the window startup and initiallize the game.
    window.onload = function () {
        getPokedex();
    }

    // This method grabs the pokedex of pokemon.
    function getPokedex() {
        fetch ("https://webster.cs.washington.edu/pokedex/pokedex.php?pokedex=all")
            .then(checkStatus)
            .then(function(responseText) {
                fillPokedex(responseText);
            })
    }

    // This function validates any AJAX respponse.
    function checkStatus (response) {
        if (response.status >= 200 && response.status <= 300) {
            return response.text();
        } else {
            return Promise.reject(new Error(response.status+": "+response.statusText));
        }
    }

    // Given a string responseText this function will fill the users pokedex with 
    // all 151 pokemon. Pokemon that the user has found (battled and won) will show
    // up normal, all others will be grayed out. The only exception to this is that
    // the 3 starter pokemon, Charmander, Bulbasaur, and Squirtle, will show up.
    function fillPokedex(responseText) {
        let book = $("pokedex-view");
        let pokearray = responseText.split(/[\n:]+/);
        for (let i = 0; i < pokearray.length - 1; i += 2) {
            let img = document.createElement("img");
            img.src = "sprites/" + pokearray[i + 1];
            img.id = pokearray[i];
            img.className = "sprite";
            if (pokedex.indexOf(pokearray[i]) >= 0) {
                img.classList += " found";
                img.onclick = getCard;
            } else {
                img.classList += " unfound";
            }
            book.appendChild(img);
        }
    }

    // This function will retrieve information to be used on each pokemons card. When it 
    // has recieved a response back it will also initiate the formating and display of that
    // specific card.
    function getCard() {
        currentPokemon = this.id.toLowerCase();
        fetch("https://webster.cs.washington.edu/pokedex/pokedex.php?pokemon=" + currentPokemon)
            .then(checkStatus)
            .then(JSON.parse)
            .then(function (responseJSON) {
                displayCard(responseJSON, "#my-card");
                let startbtn = $("start-btn");
                startbtn.className = "found";
                startbtn.onclick = battlemode;        
            })
    }

    // This function, given a pokemons JSON data and its associated card id, will populate the 
    // card with all important information. This includes its HP, moves, a small description, and
    // a picture of the pokemon.
    function displayCard(pokemon, id) {
        qsl(id + " .name").innerHTML = pokemon.name;
        qsl(id + " .pokepic").src = pokemon.images.photo;
        qsl(id + " .type").src = pokemon.images.typeIcon;
        qsl(id + " .weakness").src = pokemon.images.weaknessIcon;
        qsl(id + " .hp").innerHTML = pokemon.hp + "HP";
        qsl(id + " .info").innerHTML = pokemon.info.description;
        resetMoves(id);

        let moves = pokemon.moves;
        let moveButton = qslall(id + " .move");
        for (let i = moveButton.length - moves.length; i > 0; i--) {
            moveButton[moveButton.length - i].parentNode.className = "hidden";
        }

        for (let j = 0; j < moves.length; j++) {
            moveButton[j].innerText = moves[j].name;
            let moveImg = "icons/" + moves[j].type + ".jpg";
            moveButton[j].nextElementSibling.nextElementSibling.src = moveImg;
            if (moves[j].dp) {
                moveButton[j].nextElementSibling.innerHTML = moves[j].dp + " DP";
            } else {
                moveButton[j].nextElementSibling.innerHTML = "";
            }
            if (id === "#my-card") {
                moveButton[j].parentNode.onclick = attack;
            }
        }        
    }

    // This function, given a card id, will reset the number of moves the card
    // displays in order to setup for the next pokemon being displayed.
    function resetMoves(id) {
        let moves = qslall(id + " .moves button");
        for (let i = 0; i < moves.length; i++) {
            moves[i].className = "";
        }
    }

    // When called, this function will initiate the battle mode where it will
    // span another pokemon's card for the user to battle. 
    function battlemode() {
        $("title").innerHTML = "Pokemon Battle Mode!";
        $("pokedex-view").classList += " hidden";
        $("their-card").className = "";
        $("results-container").className = "";

        let data = new FormData();
        data.append("startgame", "true");
        data.append("mypokemon", currentPokemon);

        fetch("https://webster.cs.washington.edu/pokedex/game.php", {method: "POST", body: data})
            .then(checkStatus)
            .then(JSON.parse)
            .then(function (responseJSON) {
                guid = responseJSON.guid;
                pid = responseJSON.pid;
                displayCard(responseJSON.p2, "#their-card");
                setHealth(responseJSON.p1["current-hp"], responseJSON.p1.hp, "#my-card");
                setHealth(responseJSON.p2["current-hp"], responseJSON.p2.hp, "#their-card");
            })
        
        let buffs = qslall(".hidden.buffs");
        qsl(".hidden.hp-info").classList.remove("hidden");
        for (let i = 0; i < buffs.length; i++) {
            buffs[i].classList.remove("hidden");
        }
        let p = qslall("#results-container > p");
        for (let i = 0; i < p.length; i++) {
            p[i].classList.remove("hidden");
        }
        $("start-btn").className = "hidden";
        $("flee-btn").className = "found";
        $("flee-btn").onclick = fleeGame;
    }

    // This function will initiate an attack by the player on the opposing pokemon
    // only if a current game battle is ocurring, otherwise no action will be taken.
    // An attack call will produce and handle both the users damage from the opponents
    // attack and the damage done to the opponent by the users attack.
    function attack() {
        if (guid) {
            $("loading").classList.remove("hidden");
            let move = new FormData();
            move.append("guid", guid);
            move.append("pid", pid);
            let str = this.firstElementChild.innerHTML.replace(" ", "").toLowerCase();
            move.append("movename", str);
            fetch("https://webster.cs.washington.edu/pokedex/game.php", {method: "POST", body: move})
                .then(checkStatus)
                .then(JSON.parse)
                .then(function (outcome) {
                    $("loading").className = "hidden";
                    setHealth(outcome.p1["current-hp"], outcome.p1.hp, "#my-card", 1, outcome);
                    setHealth(outcome.p2["current-hp"], outcome.p2.hp, "#their-card", 2, outcome);
                    buffs(outcome.p1, "#my-card");
                    buffs(outcome.p2, "#their-card");
                    let parent = qslall(".buffs");
                    for (let i = 0; i < parent.length; i++) {
                        parent[i].innerHTML = "";
                    }
                })
            }
    }

    // Given the players HP, opponents HP and opponent pokemon name
    // this function will end the current battle and display the current
    // winner. Note that a user fleeing will result in them losing the 
    // battle.
    function gameOver(player, opponent, oppName) {
        let winner;
        if (player == 0) {
            winner = "You lost!";
        } else {
            winner = "You won!";
            if (pokedex.indexOf(oppName) == -1) {
                pokedex.push(oppName);
                $(oppName).classList.replace("unfound", "found");
                $(oppName).onclick = getCard;
            }
        }
        guid = null;
        $("title").innerHTML = winner;
        $("endgame").className = "";
        $("endgame").onclick = changeMode;
    }

    // When called this function will return the user back to the pokedex view
    // of the game. During a battle this may only happen either through the user
    // winning or fleeing the game. 
    function changeMode() {
        $("flee-btn").className = "hidden";
        $("start-btn").className = "found";
        qsl(".hp-info").classList += (" hidden");
        let hpBar = qslall(".health-bar");
        for (let i = 0; i < hpBar.length; i++) {
            if (hpBar[i].classList.contains("low-health")) {
                hpBar[i].classList.remove("low-health");
            }
        }
        let buffs = qslall(".buffs");
        for (let i = 0; i < buffs.length; i++) {
            buffs[i].classList += " hidden";
        }

        $("p1-turn-results").innerText = "";
        $("p2-turn-results").innerText = "";
        $("endgame").className = "hidden";
        $("results-container").className = "hidden";
        $("their-card").className = "hidden";
        $("pokedex-view").classList.remove("hidden");
        $("title").innerHTML = "Your Pokedex";
    }

    // Calling this function will end the current battle and automatically
    // declare the user to be the loser. Fleeing the battle will result in
    // the game displaying a similar message and options available when the 
    // user has lost a battle by pokemon defeat. 
    function fleeGame() {
        let move = new FormData();
        move.append("move", "flee");
        move.append("guid", guid);
        move.append("pid", pid);
        fetch ("https://webster.cs.washington.edu/pokedex/game.php", {method: "POST", body: move})
            .then(checkStatus)
            .then(JSON.parse)
            .then(function (response) {
                gameOver(response.p1["current-hp"], response.p2["current-hp"], response.p2.name);
            })
    }

    // Given the current games JSON and the current cards id, this function will 
    // populate any buffs or debuffs to the associated pokemon during battle play.
    // Any buffs will only last for that current battle and will not stay if fleeing
    // from a game.
    function buffs(game, id){
        let parent = qsl(id + " .buffs");
        let buff = game.buffs;
        let debuff = game.debuffs;
        if (buff.length > 0) {
            createBuff(buff, parent, " buff");
        }
        if (debuff.length > 0) {
            createBuff(buff, parent, " debuff");
        }
    }

    // This function creates new Buff elements for the buffList items to be placed inside.
    // Each buff is placed in the cards parent element for buffs and is given the associated
    // bufferType (buff or debuff).
    function createBuff(bufflist, parent, bufferType) {
        for (let i = 0; i < bufflist.length; i++) {
            let div = document.createElement("div");
            div.classList += bufflist[i] + bufferType;
            parent.appendChild(div);
        }
    }

    // This function keeps track and updates each pokemons health bar and HP during gameplay.
    // Given the currentHP of the pokemon, its newHP it needs to be updated, its associated
    // card id, it player number, and the current game state data, this function will alter
    // the hp, healthbar and attack descriptions to match the provided paramaters. During
    // this alteration process the function will also decide if the game is over through
    // being given a pokemons newHP of zero. If at any point during a game the hp of a pokemon
    // drops below 20%, its hp bar will turn red.
    function setHealth(currentHP, newHP, id, player, data) {
        let health = (currentHP / newHP) * 100;
        let bar = qsl(id + " .health-bar");
        qsl(id + " .hp").innerText = currentHP + "HP";
        bar.style.width =  health + "%";
        if (data) {
            if (health < 20 && !bar.classList.contains("low-health")) {
                bar.classList += " low-health";
            } 
            if (health > 0) {
                $("p" + player + "-turn-results").innerHTML = "Player " + player + " played " + data.results["p" + player + "-move"] + " and " + data.results["p" + player + "-result"] + "!";
            } else {
                $("p" + player + "-turn-results").innerHTML = "";
                gameOver(data.p1["current-hp"], data.p2["current-hp"], data.p2.name);
            }
        }
    }
})();