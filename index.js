const fetch = require("node-fetch");
const { WebSocket } = require("ws");
const { question } = require("readline-sync");

const debug = false;

// https://www.geekstrick.com/snippets/how-to-parse-cookies-in-javascript/
const parseCookie = str =>
	str
	.split(';')
	.map(v => v.split('='))
	.reduce((acc, v) => {
		acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
		return acc;
	}, {});

const createBot = async (id, name, character = "Happy Bot") => {
	// Getting BSID
	const cookie = (await fetch("https://id.blooket.com/s?n=https%3A%2F%2Fplay.blooket.com%2F", { "redirect": "manual" })).headers.get("Set-Cookie");
	if(debug) console.log(cookie);
	// Getting game info
	const gameData = await (await fetch("https://fb.blooket.com/c/firebase/join", {
		"body": `{\"id\":\"${id}\",\"name\":\"${name}\"}`,
		"method": "PUT",
		"headers": {
			"cookie": cookie
		}
	})).json();
	if(debug) console.log(gameData);
	// Claiming a temporary account
	const accountData = await (await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyCA-cTOnX19f6LFnDVVsHXya3k6ByP_MnU", {
		"body": JSON.stringify({
			"returnSecureToken": true,
			"token": gameData.fbToken
		}),
		"method": "POST",
		"headers": {
		
		}
	})).json();
	if(debug) console.log(accountData);
	// Function to add a bot to the game
	const addBot = ws => {
		ws.send(`{"t":"d","d":{"r":2,"a":"auth","b":{"cred":"${accountData.idToken}"}}}`);
		ws.send(`{"t":"d","d":{"r":5,"a":"p","b":{"p":"/${id}/c/${name}","d":{"b":"${character}"}}}}`);
	}
	// Actually joining the game now
	const ws = new WebSocket(`wss://s-usc1a-nss-2040.firebaseio.com/.ws?v=5&p=1:741533559105:web:b8cbb10e6123f2913519c0&ns=${gameData.fbShardURL.match(/blooket-\d{4}/)[0]}`);
	if(debug) ws.on("message", x => console.log(x.toString()));
	ws.on("message", msg => {
		msg = msg.toString();
		msg = JSON.parse(msg);
		if(msg.d.d){
			// Whoops, we have to reconnect!
			const ws = new WebSocket(`wss://${msg.d.d}/.ws?v=5&p=1:741533559105:web:b8cbb10e6123f2913519c0&ns=${gameData.fbShardURL.match(/blooket-\d{4}/)[0]}`);
			ws.on("open", () => addBot(ws));
		}
	})
	ws.on("open", () => addBot(ws));
};

const id = question("Enter the game ID: ");
const prefix = question("Enter the name prefix: ");
const amount = question("Enter the amount of bots: ");
(async () => {
	for(let i = 1; i <= amount; i++){
		await createBot(id, prefix + " " + i);
		console.log(`Bot #${i}: logged in`);
	}
	console.log("Done! You can exit the script when all the bots have joined the game.");
	setInterval(() => null, 9999); // Keeping the script open
})();
