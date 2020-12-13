if (process.argv.length < 3) {
	console.log("Send an open directory url as the only parameter.");
	return;
}

const apiUrlTemplate = `https://api.jikan.moe/v3/search/anime?q=_NAME_&limit=6`;
const fetch = require("node-fetch");
const fs = require("fs");
const https = require('https');

const httpsAgent = new https.Agent({
	rejectUnauthorized: false,
});

const results = [];

scanOD(process.argv[2]);

function cleanFolderName(folderName) {
	let fn = folderName.replace(/\[.+?\]/g, '')
		.replace(/_/g, ' ')
		.replace(/\//g, '')
		.replace(/TV/g, '')
		.trim();

	console.log(fn);
	return fn;
}

async function scanOD(odUrl) {
	try {
		let resp;

		if (odUrl.startsWith("https:")) {
			resp = await fetch(odUrl, {
				method: 'GET',
				agent: httpsAgent,
			});
		} else {
			resp = await fetch(odUrl);
		}
		const txt = await resp.text();

		var re = /<a href="(.+?)">(.+?)<\/a>/g;
		let m;

		let i = 0;

		do {
			m = re.exec(txt);
			if (m) {
				if (!m[1].startsWith("?")
					&& !m[1].startsWith("..")) {
					let url = m[1];
					let name = m[2];

					await queryAnimeList(cleanFolderName(name), url);
					i++;
				}
			}
		} while (m);

		writeReport(odUrl);
	} catch (err) {
		console.log(err);
	}
}

async function queryAnimeList(name, odFolderUrl) {
	const url = apiUrlTemplate.replace("_NAME_", name);
	try {
		const resp = await fetch(url);
		const json = await resp.json();
		await handleApiResult(json, name, odFolderUrl);
	} catch (err) {
		console.log(`Failed to query for ${name}`);
		console.log(err);
		return null;
	}
}

async function handleApiResult(apiResult, queryName, odFolderUrl) {
	if (!apiResult.results
		|| !apiResult.results.length) {
		console.log(`No results for ${queryName}`);
		results.push({
			title: queryName,
			odFolderUrl,
			matches: [],
		});
		return;
	}

	const exactMatch = apiResult.results
		.find(x => x.title.toLowerCase() === queryName.toLowerCase());

	if (exactMatch) {
		results.push({
			title: exactMatch.title,
			odFolderUrl,
			matches: [{
				mal_id: exactMatch.mal_id,
				title: exactMatch.title,
				url: exactMatch.url,
				synopsis: exactMatch.synopsis,
				episodes: exactMatch.episodes,
				imageUrl: exactMatch.image_url,
			}],
		});
	} else {
		results.push({
			title: queryName,
			odFolderUrl,
			matches: apiResult.results.map(res => ({
				mal_id: res.mal_id,
				title: res.title,
				url: res.url,
				synopsis: res.synopsis,
				episodes: res.episodes,
				imageUrl: res.image_url,
			})),
		});
	}
}

function writeReport(odUrl) {
	const list = results.sort((a, b) => a.title < b.title ? -1 : 1);

	let style = `<style>
		.item {
			border-bottom: 1px black solid;
			padding: 1em;
		}
		.item:nth-child(odd) {
			background-color: #ddd;
		}
		.item h3 {
			font-size: 1.5em;
		}
		.anime {
			display: inline-flex;
			width: 500px;
			border: 1px silver solid;
		}
		.anime img {
			width: 175px;
			height: 225px;
			object-fit: contain;
		}
		.anime .data {
			margin-left: .5em;
		}
		.anime .data span {
			display: block;
		}
		h3, h4 {
			margin: 0;
			margin-bottom: .5em;
		}
	</style>`;

	let htmlString = `<html><head><style></style><title>Report for ${odUrl}</title>${style}</head><body>
	`;

	list.forEach(item => {
		const odPath = `${odUrl}/${item.odFolderUrl}`.replace('//', '/');

		htmlString += `<div class="item">
			<h3><a href="${odPath}">${item.title}</a></h3>
				<div class="results">
					${(!item.matches.length
				? "No matches"
				: item.matches.map(anime =>
					`<div class="anime" data-mal-id="${anime.mal_id}">
								<img src="${anime.imageUrl}" />
								<div class="data">
									<h4><a href="${anime.url}">${anime.title}</a></h4>
									<span>${anime.synopsis}</span>
									<span><i>${anime.episodes || "?"} episodes</i></span>
								</div>
							</div>`
				).join('')
			)}
				</div>
			</div>`;
	});

	htmlString += `
	</body></html>`;

	fs.writeFileSync(`./${odUrl.replace(/(:|\/)/g, '_')}.html`,
		htmlString);
}