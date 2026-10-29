# Mockups

Design mockups that the user reviewed before a milestone was planned. A
milestone's Scope names the mockup it builds. Mockups are references for
the look, not code the site uses, and no test reads them.

`redesign-2026-10-29/`: the home table (`index.html`) and the plugin page
(`plugin.html?id=<plugin id>`) for M053 and M054. The user chose the
one-column plugin page and kept every home table part. If a
`v1/plugins.json` file is beside the pages, they read it. Otherwise they
read the deployed data file. To view them, serve the folder over HTTP, for example
`python3 -m http.server 4327 --directory cairn/mockups/redesign-2026-10-29`,
since the browser pane cannot open `file://` pages. The "Mockup options"
box switches variants. The `.xpi` links in the mockup point at the latest
release page. The site is to link to `upstream.xpiUrl`, which M052 adds
to the data, from M053 and M054.
