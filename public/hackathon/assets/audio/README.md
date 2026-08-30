# assets/audio

`automated-call.mp3` is optional and is **not** committed by default.

When present, story mode plays it at the beat where the consequence lands. When
absent, the same script is spoken by the browser's own `speechSynthesis`, which
requires no key and no network. The page works offline in both cases.

Generate with `../../tools/generate-voice.sh` once an ElevenLabs key is in
`~/.env.elevenlabs`.
