# Heated Rivalry: The Club

A fan-made party light. Open it on your phone, pick a channel, tap **Light it up**, and the whole screen becomes a club light.
Every phone on the same channel flashes in sync.

- **Channel 1, The Club:** a fast pink and blue flicker, on sixteenth notes.
- **Channel 2, Slow Burn:** green and blue, sliding back and forth.
- **Channel 3, Rivals:** pink and blue, slow, melting together.

The pink and blue are sampled from the club scene itself. Everything locks to a 126 BPM grid (the Harrison remix's tempo, by one catalog; unconfirmed); a link can set its own
(`?ch=1&bpm=128`), and the QR code carries it along. The DJ booth plays the song from the scene, Harrison's 2022 remix of t.A.T.u.'s "All the Things She Said": open it in Spotify or Apple Music, play it in a Spotify embed, or play Crave's clip of the scene from 1:55 (one phone, on a speaker).

**Live:** https://blainebooher.com/heated-rivalry-the-club/ (a channel link: `?ch=2`)

## How the sync works

There's no server. Each channel's color is a pure function of the world time (`CHANNELS[n].color(t)` in `app.js`), so two
phones on the same channel show the same color at the same moment. Each phone checks its clock against a public time server
(Akamai, then timeapi.io), keeps the quickest of a few round trips, and falls back to its own clock if neither answers.

## Phone details

- **Screen stays on:** the Screen Wake Lock API, or a tiny silent looping video on phones without it.
- **Full screen:** the Fullscreen API where the phone has it (Android). iPhone Safari doesn't allow it for pages, so on an
  iPhone, use Share, then Add to Home Screen, and open it from there.
- **Brightness:** a web page can't set it, so turn it all the way up.
- **Sharing:** the Share button shows a QR code for the channel you're on.

Plain HTML, CSS and JS, with no build step. The QR codes come from [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)
(MIT, `vendor/qrcode.js`). Not affiliated with the show.
