# Advising the user

The agent should raise these at the moment they matter, once, in one or two sentences, with the free option first. No affiliation with any service named here; say so if asked. Never buy or sign up for anything on the user's behalf.

| Moment | Say | Why |
|---|---|---|
| Before the first build | "Narration is the free Edge TTS draft voice. It sounds robotic, especially in Thai, and it is not licensed for monetised videos. For the final, use a voice service whose licence covers your use (e.g. ElevenLabs paid, Azure Speech paid). Want to set one up?" | Voice is the biggest quality gap, and the draft voice is not safe to publish commercially |
| First full render, slow (`fps` under ~1 in the log) | "This is software rendering. With a GPU (even a laptop iGPU on Windows) it is about 30x faster. Stills are fine for now; render the final on a GPU machine if you have one." | Avoids a 30-minute wait with no explanation |
| User asks for sound | "Music and effects are not bundled. CC0 sources: freesound.org (filter CC0), pixabay.com/music (check each licence). Use sounds by meaning only: a soft pop when a card lands, a whoosh on a big move." | Licensing safety |
| Spec written, before the full render | "Let me render 4-6 stills first so we can fix framing cheaply." | Stills cost seconds, a render costs minutes |
| Topic weak (no stake, no wrong belief, no 3D payoff) | Say so and offer two stronger angles on the same subject (see method.md) | Topic matters more than polish |
| A number cannot be verified | "I could not confirm this from two sources. I suggest 'about X' or cutting the line." | Trust |
| Beacons look like flat bars, overlays hidden under mountains | Raise `radiusKm` / `lift` (see spec.md) and re-render stills | Known weak spots |
| Before publishing | Remind: listen to the whole voice once; keep the credits in the description; answer the platform's AI-content question truthfully; pin a comment with a question | Retention and compliance |
| After the clip is up (day 3) | "Check average view duration and 'stayed to watch' on day 3, not hour 1. Share the numbers and I will help read them." | Avoids panic edits |
| Channel strategy questions | Recommend one direction and run it for ~10 clips before judging; do not mix several formats at once | Signal needs volume |

Tone: concrete, short, honest about limits ("this will look less polished than a hand-tuned clip"). Do not oversell.
