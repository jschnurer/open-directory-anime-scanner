# open-directory-anime-scanner
Scans a given URL to find all links and look them up via api.

# Usage
`node .\scan.js urlToOpenDirectory`

This will attempt to find all links on the page and look each one up via https://api.jikan.moe.

The resulting list is outputted as an html report in the current directory.

Each title that had api results will appear in the list. If multiple results were found, they will all be shown on the row. If an exact title match is found, the script will assume that is the correct one and show only it in the results.