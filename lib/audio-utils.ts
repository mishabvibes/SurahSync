export interface Region {
    start: number;
    end: number;
}

export function detectSilentRegions(
    audioBuffer: AudioBuffer,
    minSilenceDuration: number = 0.5, // seconds
    minSoundDuration: number = 0.5,   // seconds
    threshold: number = 0.05,         // amplitude (0-1)
    padding: number = 0.2             // seconds to add to start/end
): Region[] {
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const sampleRate = audioBuffer.sampleRate;

    const regions: Region[] = [];
    let isSilent = true;
    let soundStart = 0;
    let silenceStart = 0;

    // Helper to convert samples to seconds
    const toSeconds = (samples: number) => samples / sampleRate;

    for (let i = 0; i < channelData.length; i++) {
        const amplitude = Math.abs(channelData[i]);

        if (amplitude > threshold) {
            if (isSilent) {
                // Sound started
                isSilent = false;
                soundStart = i;
            }
        } else {
            if (!isSilent) {
                // Potential silence started
                if (toSeconds(i - soundStart) > minSoundDuration) {
                    // We had a valid sound segment, now identifying standard silence
                    silenceStart = i;
                    isSilent = true;

                    // If we've been silent for long enough, or this is the end, mark the region
                }
            }
        }
    }

    // Revised simple algorithm: segment by "Sound"
    // Scan for sound > threshold. 
    // If sound < threshold for > minSilenceDuration, cut.

    const soundRegions: Region[] = [];
    let currentStart: number | null = null;
    let silenceSamples = 0;
    const minSilenceSamples = minSilenceDuration * sampleRate;

    for (let i = 0; i < channelData.length; i++) {
        if (Math.abs(channelData[i]) > threshold) {
            if (currentStart === null) currentStart = i;
            silenceSamples = 0;
        } else {
            if (currentStart !== null) {
                silenceSamples++;
                if (silenceSamples > minSilenceSamples) {
                    // End of a segment
                    const end = i - silenceSamples;
                    if (toSeconds(end - currentStart) >= minSoundDuration) {
                        soundRegions.push({
                            start: Math.max(0, toSeconds(currentStart) - padding),
                            end: Math.min(audioBuffer.duration, toSeconds(end) + padding)
                        });
                    }
                    currentStart = null;
                    silenceSamples = 0;
                }
            }
        }
    }

    // Handle case where file ends with sound
    if (currentStart !== null) {
        const end = channelData.length;
        if (toSeconds(end - currentStart) >= minSoundDuration) {
            soundRegions.push({
                start: Math.max(0, toSeconds(currentStart) - padding),
                end: audioBuffer.duration
            });
        }
    }

    return soundRegions;
}
