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

export function sliceAudioBuffer(buffer: AudioBuffer, start: number, end: number): AudioBuffer {
    const rate = buffer.sampleRate;
    const startOffset = Math.max(0, Math.floor(start * rate));
    const endOffset = Math.min(buffer.length, Math.floor(end * rate));
    const frameCount = endOffset - startOffset;

    const newBuffer = new AudioContext().createBuffer(
        buffer.numberOfChannels,
        frameCount,
        rate
    );

    for (let i = 0; i < buffer.numberOfChannels; i++) {
        const channelData = buffer.getChannelData(i);
        const newChannelData = newBuffer.getChannelData(i);
        for (let j = 0; j < frameCount; j++) {
            newChannelData[j] = channelData[startOffset + j];
        }
    }
    return newBuffer;
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"

    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // length = 16
    setUint16(1);                                  // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit (hardcoded in this writer)

    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while (pos < buffer.length) {
        for (i = 0; i < numOfChan; i++) {             // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(44 + offset, sample, true);          // write 16-bit sample
            offset += 2;
        }
        pos++;
    }

    // helper functions
    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    return new Blob([bufferArray], { type: 'audio/wav' });
}
