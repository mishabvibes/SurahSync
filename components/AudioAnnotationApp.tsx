"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Wavesurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Pause, Download, Plus, Trash2, SkipBack, SkipForward, FileAudio, Save, Wand2, RefreshCw, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { detectSilentRegions } from '@/lib/audio-utils'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type AyahType = 'ayah' | 'aameen'

interface AyahItem {
    id: string
    type: AyahType
    number?: number
    start: number | null
    end: number | null
}

// Sortable Item Component
function SortableAyahItem(props: {
    ayah: AyahItem,
    index: number,
    onRemove: (id: string) => void,
    onCapture: (id: string, field: 'start' | 'end') => void,
    onUpdate: (id: string, field: 'start' | 'end', val: number) => void,
    onInsertAfter: (index: number) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.ayah.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: isDragging ? 'relative' as const : 'static' as const,
    };

    const { ayah, onRemove, onCapture, onUpdate, onInsertAfter, index } = props;

    return (
        <div ref={setNodeRef} style={style} className={cn("relative group mb-3", isDragging && "opacity-50")}>
            <div className={cn(
                "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border transition-all duration-200 bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm",
                ayah.type === 'aameen' && "bg-purple-50 border-purple-100"
            )}>
                <div className="flex justify-between items-center sm:block">
                    <div className="flex items-center gap-2">
                        {/* Drag Handle */}
                        <div {...attributes} {...listeners} className="cursor-grab hover:text-indigo-600 text-slate-400">
                            <GripVertical className="w-5 h-5" />
                        </div>

                        <div className={cn(
                            "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm border",
                            ayah.type === 'aameen' ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                            {ayah.type === 'aameen' ? 'AM' : ayah.number}
                        </div>
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 sm:hidden" onClick={() => onRemove(ayah.id)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-grow grid grid-cols-2 gap-3">
                    <div className="relative">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase absolute -top-1.5 left-2 bg-white px-1 z-10">Start</label>
                        <div className="flex items-center">
                            <Input
                                className="h-9 font-mono text-xs text-center pr-8"
                                value={ayah.start?.toFixed(2) || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value)
                                    if (!isNaN(val)) onUpdate(ayah.id, 'start', val)
                                }}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-0.5 h-8 w-8 text-slate-400 hover:text-indigo-600"
                                onClick={() => onCapture(ayah.id, 'start')}
                                title="Capture current time"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase absolute -top-1.5 left-2 bg-white px-1 z-10">End</label>
                        <div className="flex items-center">
                            <Input
                                className="h-9 font-mono text-xs text-center pr-8"
                                value={ayah.end?.toFixed(2) || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value)
                                    if (!isNaN(val)) onUpdate(ayah.id, 'end', val)
                                }}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-0.5 h-8 w-8 text-slate-400 hover:text-indigo-600"
                                onClick={() => onCapture(ayah.id, 'end')}
                                title="Capture current time"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hidden sm:inline-flex opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemove(ayah.id)}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Insert Button Connector */}
            <div className="absolute -bottom-4 left-0 right-0 h-4 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-5 text-[10px] bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 shadow-sm"
                    onClick={() => onInsertAfter(index)}
                >
                    <Plus className="w-3 h-3 mr-1" /> Insert Here
                </Button>
            </div>
        </div>
    )
}

export default function AudioAnnotationApp() {
    const [file, setFile] = useState<File | null>(null)
    const [surahId, setSurahId] = useState<string>('')
    const [surahName, setSurahName] = useState<string>('')
    const [ayahs, setAyahs] = useState<AyahItem[]>([])
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)

    // Auto-segmentation settings
    const [silenceThreshold, setSilenceThreshold] = useState(0.02)
    const [minSilenceDuration, setMinSilenceDuration] = useState(0.8)

    const waveformRef = useRef<HTMLDivElement>(null)
    const wavesurferRef = useRef<Wavesurfer | null>(null)
    const regionsPluginRef = useRef<RegionsPlugin | null>(null)

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (waveformRef.current && !wavesurferRef.current) {
            wavesurferRef.current = Wavesurfer.create({
                container: waveformRef.current,
                waveColor: '#4f46e5',
                progressColor: '#818cf8',
                cursorColor: '#c7d2fe',
                barWidth: 2,
                barGap: 3,
                height: 120,
                normalize: true,
                plugins: []
            })

            // Initialize Regions Plugin
            const wsRegions = RegionsPlugin.create()
            wavesurferRef.current.registerPlugin(wsRegions)
            regionsPluginRef.current = wsRegions

            // Event Listeners
            wavesurferRef.current.on('play', () => setIsPlaying(true))
            wavesurferRef.current.on('pause', () => setIsPlaying(false))
            wavesurferRef.current.on('timeupdate', (time) => setCurrentTime(time))
            wavesurferRef.current.on('ready', (d) => setDuration(d))
            wavesurferRef.current.on('decode', () => {
                // clean up old regions on new file load
                regionsPluginRef.current?.clearRegions()
            })

            // Sync Region dragging/resizing to State
            wsRegions.on('region-updated', (region) => {
                setAyahs(prev => prev.map(a => {
                    if (a.id === region.id) {
                        return { ...a, start: region.start, end: region.end }
                    }
                    return a
                }))
            })

            // Select region on click
            wsRegions.on('region-clicked', (region, e) => {
                e.stopPropagation()
                region.play()
            })
        }

        // Cleanup
        const ws = wavesurferRef.current
        return () => {
            // ws?.destroy() // React StrictMode can cause double init issues if not careful, better to leave or handle specifically
        }
    }, [])

    // Sync State changes (deletion/addition) TO Regions
    // We need to be careful not to create infinite loops. 
    // We only want to add regions if they don't exist, or update them if they changed from OUTSIDE (like manual input).
    // For now, simpler: data -> regions is hard because regions -> data happens constantly during drag.
    // We'll rely on initial creation and the "Capture" buttons updating state, which should update regions?
    // Actually, let's just create regions when we add Ayahs, and update them when we manually capture.

    useEffect(() => {
        if (!regionsPluginRef.current) return;

        // This sync is tricky. Let's do a "soft" sync.
        // If an ayah exists but has no region, create it.
        // If a region exists but no ayah, remove it (handled by removeAyah).

        const regions = regionsPluginRef.current.getRegions()

        ayahs.forEach(ayah => {
            const existingRegion = regions.find(r => r.id === ayah.id)
            if (ayah.start !== null && ayah.end !== null) {
                if (!existingRegion) {
                    regionsPluginRef.current?.addRegion({
                        id: ayah.id,
                        start: ayah.start,
                        end: ayah.end,
                        color: ayah.type === 'aameen' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(79, 70, 229, 0.2)',
                        drag: true,
                        resize: true,
                    })
                } else {
                    // Update position if state changed markedly (to avoid feedback loop from small drags)
                    if (Math.abs(existingRegion.start - ayah.start) > 0.1 || Math.abs(existingRegion.end - ayah.end) > 0.1) {
                        existingRegion.setOptions({ start: ayah.start, end: ayah.end })
                    }
                    // Update color if type changed
                    const color = ayah.type === 'aameen' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(79, 70, 229, 0.2)'
                    if (existingRegion && existingRegion.element && existingRegion.element.style.backgroundColor !== color) {
                        existingRegion.setOptions({ color })
                    }
                }
            }
        })

        // Cleanup deleted regions
        regions.forEach(r => {
            if (!ayahs.find(a => a.id === r.id)) {
                r.remove()
            }
        })

    }, [ayahs])


    useEffect(() => {
        if (file && wavesurferRef.current) {
            const url = URL.createObjectURL(file)
            wavesurferRef.current.load(url)
            // Reset state
            setAyahs([])
            regionsPluginRef.current?.clearRegions()
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

    const runAutoSegment = async () => {
        if (!wavesurferRef.current) return
        setIsProcessing(true)

        // Small timeout to allow UI to show processing state
        setTimeout(() => {
            try {
                const decodedData = wavesurferRef.current?.getDecodedData()
                if (decodedData) {
                    const regions = detectSilentRegions(decodedData, minSilenceDuration, 0.5, silenceThreshold)

                    // Convert regions to Ayahs
                    const newAyahs: AyahItem[] = regions.map((r, i) => ({
                        id: crypto.randomUUID(),
                        type: 'ayah',
                        number: i + 1,
                        start: r.start,
                        end: r.end
                    }))

                    // Clear existing
                    regionsPluginRef.current?.clearRegions()
                    setAyahs(newAyahs)
                }
            } catch (e) {
                console.error(e)
                alert("Error analyzing audio. Try adjusting settings.")
            }
            setIsProcessing(false)
        }, 100)
    }

    const addAyah = () => {
        const nextNumber = ayahs.filter(a => a.type === 'ayah').length + 1
        const newAyah: AyahItem = {
            id: crypto.randomUUID(),
            type: 'ayah',
            number: nextNumber,
            start: wavesurferRef.current ? wavesurferRef.current.getCurrentTime() : 0,
            end: wavesurferRef.current ? wavesurferRef.current.getCurrentTime() + 2 : 2 // Default 2s duration
        }
        setAyahs([...ayahs, newAyah])
    }

    const addAameen = () => {
        if (ayahs.some(a => a.type === 'aameen')) return;
        const newAyah: AyahItem = {
            id: crypto.randomUUID(),
            type: 'aameen',
            start: wavesurferRef.current ? wavesurferRef.current.getCurrentTime() : 0,
            end: wavesurferRef.current ? wavesurferRef.current.getCurrentTime() + 2 : 2
        }
        setAyahs([...ayahs, newAyah])
    }

    const reIndexAyahs = (items: AyahItem[]): AyahItem[] => {
        let count = 1;
        return items.map(item => {
            if (item.type === 'ayah') {
                return { ...item, number: count++ }
            }
            return item
        })
    }

    const removeAyah = (id: string) => {
        setAyahs(prev => {
            const filtered = prev.filter(a => a.id !== id);
            return reIndexAyahs(filtered)
        })
    }

    const insertAyahAfter = (index: number) => {
        const newAyah: AyahItem = {
            id: crypto.randomUUID(),
            type: 'ayah',
            start: wavesurferRef.current ? wavesurferRef.current.getCurrentTime() : 0,
            end: wavesurferRef.current ? wavesurferRef.current.getCurrentTime() + 2 : 2
        }

        const newAyahs = [...ayahs];
        newAyahs.splice(index + 1, 0, newAyah);

        // Re-index
        const reindexed = reIndexAyahs(newAyahs);
        setAyahs(reindexed);
    }

    const updateAyahField = (id: string, field: 'start' | 'end', val: number) => {
        setAyahs(prev => prev.map(a => a.id === id ? { ...a, [field]: val } : a))
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setAyahs((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over?.id);
                const newOrder = arrayMove(items, oldIndex, newIndex);
                return reIndexAyahs(newOrder);
            });
        }
    }

    const captureTime = (id: string, field: 'start' | 'end') => {
        if (!wavesurferRef.current) return
        const time = wavesurferRef.current.getCurrentTime()
        updateAyahField(id, field, time)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        const ms = Math.floor((seconds % 1) * 100)
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
    }

    const exportData = () => {
        const exportAyahs = ayahs.map(a => {
            const payload: any = {
                start: a.start !== null ? parseFloat(a.start.toFixed(2)) : 0,
                end: a.end !== null ? parseFloat(a.end.toFixed(2)) : 0
            }
            if (a.type === 'ayah') {
                payload.ayah = a.number
            } else {
                payload.aameen = 1
            }
            return payload
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

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (wavesurferRef.current) {
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
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            SurahSync
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">AI-Assisted Audio Annotation</p>
                    </div>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()} className="flex-1 md:flex-none">
                            <FileAudio className="w-4 h-4 mr-2" />
                            {file ? 'Change' : 'Upload Audio'}
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

                    {/* Left Column: Tools & Info */}
                    <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">

                        {/* Auto Segmenation Controls */}
                        <Card className="shadow-sm border-slate-100 bg-indigo-50/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-indigo-900">
                                    <Wand2 className="w-4 h-4" /> Auto-Segmentation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-500 font-medium uppercase">
                                        <span>Silence Threshold</span>
                                        <span>{Math.round(silenceThreshold * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.001"
                                        max="0.1"
                                        step="0.001"
                                        value={silenceThreshold}
                                        onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-500 font-medium uppercase">
                                        <span>Min Silence Duration</span>
                                        <span>{minSilenceDuration}s</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="2.0"
                                        step="0.1"
                                        value={minSilenceDuration}
                                        onChange={(e) => setMinSilenceDuration(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <Button
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
                                    onClick={runAutoSegment}
                                    disabled={!file || isProcessing}
                                >
                                    {isProcessing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                    {isProcessing ? 'Processing...' : 'Run Auto-Detect'}
                                </Button>
                                <p className="text-[10px] text-slate-500 text-center leading-tight">
                                    Detects ayahs based on pauses. Adjust slider if it misses segments or splits too often.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-slate-100">
                            <CardHeader>
                                <CardTitle>Metadata</CardTitle>
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

                        {/* Waveform Player */}
                        <Card className="overflow-hidden shadow-sm border-slate-100">
                            <div className="p-4 md:p-6 bg-slate-900 relative group">
                                <div id="waveform" ref={waveformRef} className="w-full" />

                                {/* Centered Play Button Overlay */}
                                {file && !isPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-white/10 backdrop-blur-sm rounded-full p-4 border border-white/20 shadow-2xl">
                                            <Play className="w-8 h-8 text-white fill-white" />
                                        </div>
                                    </div>
                                )}

                                {!file && (
                                    <div className="h-[120px] flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-700 rounded-lg text-center p-4">
                                        Upload an audio file to start
                                    </div>
                                )}
                            </div>
                            <CardContent className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => wavesurferRef.current?.skip(-5)}>
                                        <SkipBack className="w-5 h-5 text-slate-600" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={togglePlayPause} className="border-slate-300">
                                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => wavesurferRef.current?.skip(5)}>
                                        <SkipForward className="w-5 h-5 text-slate-600" />
                                    </Button>
                                </div>
                                <div className="font-mono text-sm font-medium text-slate-600">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Ayah List */}
                        <Card className="shadow-sm border-slate-100">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle>Segments ({ayahs.length})</CardTitle>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={addAyah} variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-8">
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                                    </Button>
                                    <Button size="sm" onClick={addAameen} variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50 h-8" disabled={ayahs.some(a => a.type === 'aameen')}>
                                        <Save className="w-3.5 h-3.5 mr-1" /> Aameen
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="max-h-[500px] overflow-y-auto pr-2">
                                <div className="space-y-3">
                                    {ayahs.length === 0 && (
                                        <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                                            <p>No segments yet.</p>
                                            <p className="text-xs mt-1">Upload audio and click "Run Auto-Detect"</p>
                                        </div>
                                    )}
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={ayahs.map(a => a.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {ayahs.map((ayah, index) => (
                                                <SortableAyahItem
                                                    key={ayah.id}
                                                    ayah={ayah}
                                                    index={index}
                                                    onRemove={removeAyah}
                                                    onCapture={captureTime}
                                                    onUpdate={updateAyahField}
                                                    onInsertAfter={insertAyahAfter}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
