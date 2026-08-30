# assets/audio

`automated-call.mp3` — the automated call played in story mode.

**Currently rendered with [Piper](https://github.com/OHF-Voice/piper1-gpl)**
(`en_GB-jenny_dioco-medium`), locally and offline, then given a telephone
bandpass (300–3400 Hz, mono, 64 kbps) so it sounds like the robocall it is
supposed to be. Committed deliberately: it removes any dependency on the
demo machine having speech voices installed.

To re-render with ElevenLabs once a key exists in `~/.env.elevenlabs`, run
`../../tools/generate-voice.sh`, which overwrites this file.

If the file is deleted, story mode falls back to the browser's own
`speechSynthesis`. Either way there is no runtime network call.
