const query="what is the time now"
const url = `https://api.duckduckgo.com/?q=${query}&format=json&pretty=1&no_html=1&skip_disambig=1`;
const options = {
	method: 'GET',
	headers: {
		'x-rapidapi-key': '4f61383dadmsh405c98d146118c5p18927ajsn3ffa045e5f70',
		'x-rapidapi-host': 'duckduckgo-duckduckgo-zero-click-info.p.rapidapi.com'
	}
};

try {
	const response = await fetch(url, options);
	const result = await response.text();
	console.log(result);
} catch (error) {
	console.error(error);
}