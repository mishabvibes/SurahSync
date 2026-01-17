"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Wavesurfer from 'wavesurfer.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Pause, Download, Plus, Trash2, SkipBack, SkipForward, FileAudio, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

type AyahType = 'ayah' | 'aameen'

interface AyahItem {
    id: string
    type: AyahType
    number?: number
    start: number | null
    end: number | null
}

export default function AudioAnnotationApp() {
    const [file, setFile] = useState<File | null>(null)
    const [surahId, setSurahId] = useState<string>('')
    const [surahName, setSurahName] = useState<string>('')
    const [ayahs, setAyahs] = useState<AyahItem[]>([])
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)

    const waveformRef = useRef<HTMLDivElement>(null)
    const wavesurferRef = useRef<Wavesurfer | null>(null)

    useEffect(() => {
        if (waveformRef.current && !wavesurferRef.current) {
            wavesurferRef.current = Wavesurfer.create({
                container: waveformRef.current,
                waveColor: '#4f46e5',
                progressColor: '#818cf8',
                cursorColor: '#c7d2fe',
                barWidth: 2,
                barGap: 3,
                height: 100,
                normalize: true,
            })

            wavesurferRef.current.on('play', () => setIsPlaying(true))
            wavesurferRef.current.on('pause', () => setIsPlaying(false))
            wavesurferRef.current.on('timeupdate', (time) => setCurrentTime(time))
            wavesurferRef.current.on('ready', (d) => setDuration(d))
        }

        return () => {
            // cleanup if needed
        }
    }, [])

    useEffect(() => {
        if (file && wavesurferRef.current) {
            const url = URL.createObjectURL(file)
            wavesurferRef.current.load(url)
            return () => URL.revokeObjectURL(url)
        }
    }, [file])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const togglePlayPause = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause()
        }
    }

    const addAyah = () => {
        const nextNumber = ayahs.filter(a => a.type === 'ayah').length + 1
        const newAyah: AyahItem = {
            id: crypto.randomUUID(),
            type: 'ayah',
            number: nextNumber,
            start: null,
            end: null
        }
        setAyahs([...ayahs, newAyah])
    }

    const addAameen = () => {
        // Check if Aameen already exists
        if (ayahs.some(a => a.type === 'aameen')) return;

        const newAyah: AyahItem = {
            id: crypto.randomUUID(),
            type: 'aameen',
            start: null,
            end: null
        }
        setAyahs([...ayahs, newAyah])
    }

    const removeAyah = (id: string) => {
        setAyahs(ayahs.filter(a => a.id !== id))
        // Re-index ayahs if necessary? The user might want explicit control, but auto-increment is safer for basic flow.
        // simpler: valid re-index only on export or just let them be. 
        // Let's re-calculate numbers for rendering logic, but storage is state.
        // If I delete #2, #3 becomes #2? Standard behavior usually yes.
        setAyahs(prev => {
            const filtered = prev.filter(a => a.id !== id);
            let count = 1;
            return filtered.map(item => {
                if (item.type === 'ayah') {
                    return { ...item, number: count++ }
                }
                return item
            })
        })
    }

    const captureTime = (id: string, field: 'start' | 'end') => {
        if (!wavesurferRef.current) return
        const time = parseFloat(wavesurferRef.current.getCurrentTime().toFixed(2))

        setAyahs(ayahs.map(a => {
            if (a.id === id) {
                return { ...a, [field]: time }
            }
            return a
        }))
    }

    const handleSeek = (time: number) => {
        if (wavesurferRef.current) {
            wavesurferRef.current.setTime(time)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        const ms = Math.floor((seconds % 1) * 100)
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
    }

    const exportData = () => {
        const exportAyahs = ayahs.map(a => {
            if (a.type === 'ayah') {
                return {
                    ayah: a.number,
                    start: a.start || 0,
                    end: a.end || 0
                }
            } else {
                return {
                    aameen: 1, // or just 'aameen' key
                    start: a.start || 0,
                    end: a.end || 0
                }
            }
        })

        const data = {
            surah: parseInt(surahId) || 0,
            surahName: surahName,
            audio: file ? file.name : '',
            ayahs: exportAyahs
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${surahName || 'surah'}_timings.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    // Handle window resize to update waveform
    useEffect(() => {
        const handleResize = () => {
            if (wavesurferRef.current) {
                // Small delay to ensure container has resized
                setTimeout(() => {
                    wavesurferRef.current?.setTime(wavesurferRef.current.getCurrentTime())
                }, 100)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            Quran Audio Annotator
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Precise timestamp capture tool</p>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()} className="flex-1 md:flex-none">
                            <FileAudio className="w-4 h-4 mr-2" />
                            {file ? 'Change' : 'Upload'}
                        </Button>
                        <input
                            id="file-upload"
                            type="file"
                            accept="audio/mp3,audio/wav"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button onClick={exportData} disabled={!file || ayahs.length === 0} className="bg-indigo-600 hover:bg-indigo-700 flex-1 md:flex-none">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: Controls & Info */}
                    <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
                        <Card className="shadow-sm border-slate-100">
                            <CardHeader>
                                <CardTitle>Playback</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex justify-center items-center gap-4">
                                    <Button variant="ghost" size="icon" onClick={() => wavesurferRef.current?.skip(-5)}>
                                        <SkipBack className="w-6 h-6" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        className="h-16 w-16 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                        onClick={togglePlayPause}
                                    >
                                        {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => wavesurferRef.current?.skip(5)}>
                                        <SkipForward className="w-6 h-6" />
                                    </Button>
                                </div>
                                <div className="text-center font-mono text-2xl text-indigo-900 tracking-wider">
                                    {formatTime(currentTime)} <span className="text-slate-300">/</span> {formatTime(duration)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-100">
                            <CardHeader>
                                <CardTitle>Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Surah ID</label>
                                    <Input
                                        placeholder="e.g. 1"
                                        value={surahId}
                                        onChange={(e) => setSurahId(e.target.value)}
                                        type="number"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase text-slate-500 mb-1 block">Surah Name</label>
                                    <Input
                                        placeholder="e.g. Al-Fatiha"
                                        value={surahName}
                                        onChange={(e) => setSurahName(e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Waveform & List */}
                    <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">

                        {/* Waveform */}
                        <Card className="overflow-hidden shadow-sm border-slate-100">
                            <div className="p-4 md:p-6 bg-slate-900">
                                <div id="waveform" ref={waveformRef} className="w-full" />
                                {!file && (
                                    <div className="h-[100px] flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-700 rounded-lg text-center p-4">
                                        Upload an audio file to start
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Ayah List */}
                        <Card className="shadow-sm border-slate-100">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Ayahs</CardTitle>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={addAyah} variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                        <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Add Ayah</span><span className="inline sm:hidden">Add</span>
                                    </Button>
                                    <Button size="sm" onClick={addAameen} variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50" disabled={ayahs.some(a => a.type === 'aameen')}>
                                        <Save className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Add Aameen</span><span className="inline sm:hidden">Aameen</span>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {ayahs.length === 0 && (
                                        <div className="text-center py-10 text-slate-400 text-sm">
                                            No ayahs added yet.
                                        </div>
                                    )}
                                    {ayahs.map((ayah, index) => (
                                        <div key={ayah.id} className={cn(
                                            "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all duration-200",
                                            ayah.type === 'aameen' ? "bg-purple-50 border-purple-100" : "bg-white border-slate-100 hover:border-indigo-100"
                                        )}>
                                            <div className="flex justify-between items-center sm:block">
                                                <div className={cn(
                                                    "flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full font-bold text-sm",
                                                    ayah.type === 'aameen' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                                                )}>
                                                    {ayah.type === 'aameen' ? 'AM' : ayah.number}
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 sm:hidden" onClick={() => removeAyah(ayah.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className="flex-grow grid grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Start</span>
                                                    <Button size="sm" variant={ayah.start ? "default" : "secondary"} className={cn("h-9 w-full text-xs font-mono", ayah.start && "bg-emerald-500 hover:bg-emerald-600")} onClick={() => captureTime(ayah.id, 'start')}>
                                                        {ayah.start !== null ? ayah.start.toFixed(2) : "Capture"}
                                                    </Button>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">End</span>
                                                    <Button size="sm" variant={ayah.end ? "default" : "secondary"} className={cn("h-9 w-full text-xs font-mono", ayah.end && "bg-rose-500 hover:bg-rose-600")} onClick={() => captureTime(ayah.id, 'end')}>
                                                        {ayah.end !== null ? ayah.end.toFixed(2) : "Capture"}
                                                    </Button>
                                                </div>
                                            </div>

                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hidden sm:inline-flex" onClick={() => removeAyah(ayah.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
