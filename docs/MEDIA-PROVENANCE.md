# Demo media

The demo uses original narration, the Kujo logo, Departure Mono, and captures of the running factory. Source screenshots and recordings must show the actual application.

## Narration

The 101-word script describes the implemented workflow without promising a speed or claiming review approval. It uses ElevenLabs Siren (`eXpIbVcVbLo8ZJQDlDnl`) with `eleven_v4`. Siren is a synthetic narrator; she does not claim the founder's work history.

One generation used the canonical `kujo-agents/videoops/tools/bin/videoops` media runtime. A workspace-bound grant allowed one exact request, up to 1,000 included credits, and no incremental charge. The provider reported 255 credits. Dollar usage was not reported; the receipt does not call the generation free. Credentials stayed in the OS keychain.

The provider returned 36.08 seconds of mono, 44.1 kHz MP3. The runtime decoded the audio and saved a PCM copy, then rejected its optional alignment with `ALIGNMENT_INVALID`. The failed receipt remains intact. No second generation was requested. A separate canonical local-import receipt registers the existing audio after loudness normalization. That receipt passed decoding and format checks and declares alignment unavailable. It does not erase the failed provider receipt. The master measured -17.18 LUFS with a -1.50 dB true peak; its duration is 36.08 seconds. Alignment and perceptual review remain separate from successful decoding.

Local evidence lives under `.runtime/demo-media/`: the script, request fingerprint, bounded grant, account inspection, provider receipt, original audio, normalized audio, and audio measurements. These runtime files are not shipped as credentials or embedded in the installer.

The account inspection confirmed a Creator subscription and no overage. [ElevenLabs billing terms](https://elevenlabs.io/docs/overview/administration/billing) describe commercial rights for eligible output generated on paid plans. [Current model documentation](https://elevenlabs.io/docs/overview/models) identifies `eleven_v4`. Voice lookup succeeded; the model-list endpoint denied this key's read permission.

## Music

The optional instrumental bed is an original local synthesis of quiet tones and pulses. It uses no samples, external recording, paid provider, or imitation of a named song. The source generator is retained with the local media evidence.

## Review

Decode checks and audio measurements do not prove listening, pronunciation, transcript fidelity, or suitability. A candidate must remain pending until the required review binds to its exact SHA-256. Keep acquisition receipts separate from that decision.
