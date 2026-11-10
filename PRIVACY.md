# AuDioPrism privacy policy

Last updated: 2026-11-10. Applies to AuDioPrism 2.2.9 and later.

**AuDioPrism does not collect, send, sell or share any data.** The extension makes no network request of its own. Everything it does happens inside your browser.

## What it touches, and what happens to it

**The sound of your music tab.** When you start AuDioPrism on a YouTube Music, Spotify Web or Apple Music Web tab, Chrome hands the extension that tab's audio. The extension processes it (spatial motion, EQ, compression, optional tones and noise) and plays the result on your speakers or headphones. The audio is not recorded, not saved and not sent anywhere. Processing stops when you stop the engine or close the tab.

**What is playing.** The mixer shows the current track's title, artist and cover picture, and its play, pause, next, previous and seek controls operate the page's own player. To do this it reads those items from the player page you have open. They are held in the page's memory while the mixer is open. They are not saved and not sent anywhere.

**Your mixer settings.** Knob positions, on/off switches, the chosen preset and the position of the launcher button are saved in the extension's local storage in your browser (`chrome.storage.local`), so the mixer opens the way you left it. They stay on your computer, are not synced to any account, and are deleted when you remove the extension.

## What it does not do

- No account, sign-in or personal profile.
- No analytics, tracking, advertising or cookies.
- No recording of audio, and no access to your microphone.
- No reading of pages other than music.youtube.com, open.spotify.com, play.spotify.com and music.apple.com.
- No code loaded from the internet: everything the extension runs is in the package you installed.

## Permissions, in one line each

- `tabCapture`: receive the audio of the music tab you start it on, so it can be processed.
- `offscreen`: keep the audio engine running while the mixer panel is closed.
- `scripting` and site access to the four music sites: put the mixer panel on those pages.
- `tabs` and `activeTab`: find your open music tab and tell it when the engine starts or stops.
- `storage`: remember your mixer settings on your computer.

## Health

AuDioPrism is an audio tool. The optional binaural and isochronic tones are sound effects, not a treatment, and the extension makes no medical claim. If a setting is uncomfortable, turn it off.

## Changes and contact

If a later version changes any of this, this page changes first. Questions and reports: https://github.com/TheOneTrueNiz/AuDioPrism/issues

AuDioPrism is free software under the GNU GPL v3.0. The full source is at https://github.com/TheOneTrueNiz/AuDioPrism
