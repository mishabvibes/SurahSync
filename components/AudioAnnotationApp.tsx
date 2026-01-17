"use client"

import React, { useState, useRef, useEffect } from 'react'
import Wavesurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Pause, Download, Plus, Trash2, SkipBack, SkipForward, FileAudio, Save, Wand2, RefreshCw, GripVertical, Activity, Layers, Music, Settings2 } from 'lucide-react'
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

// Rewritten SortableAyahItem with Modern Design
function SortableAyahItem(props: {
    ayah: AyahItem,
    index: number,
    onRemove: (id: string) => void,
    onCapture: (id: string, field: 'start' | 'end') => void,
    onUpdate: (id: string, field: 'start' | 'end', val: number) => void,
    onInsertAfter: (index: number) => void
    onPlay: (id: string) => void
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

    const { ayah, onRemove, onCapture, onUpdate, onInsertAfter, onPlay, index } = props;

    // Helper for timer input aesthetic
    const TimeInput = ({ value, type }: { value: number | null, type: 'start' | 'end' }) => (
        <div className="relative group/input">
            <div className="flex items-center bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                <Input
                    className="h-8 w-20 font-mono text-xs font-medium border-none bg-transparent focus-visible:ring-0 px-0 text-center text-slate-700"
                    value={value?.toFixed(2) || ''}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val)) onUpdate(ayah.id, type, val)
                    }}
                />
                <div className="w-[1px] h-4 bg-slate-200"></div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-transparent"
                    onClick={() => onCapture(ayah.id, type)}
                    title={`Capture ${type} time`}
                >
                    <RefreshCw className="w-3 h-3" />
                </Button>
            </div>
            <label className="absolute -top-1.5 left-2 bg-white px-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider">{type}</label>
        </div>
    )

    return (
        <div ref={setNodeRef} style={style} className={cn("relative mb-3 transition-all outline-none", isDragging && "z-50 scale-[1.02]")}>
            <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 bg-white group hover:shadow-md",
                isDragging ? "shadow-xl border-indigo-500/50 ring-4 ring-indigo-50/50" : "shadow-sm border-slate-200/60",
                ayah.type === 'aameen' && "bg-purple-50/30 border-purple-200/60"
            )}>
                {/* Drag Handle */}
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1.5 hover:bg-slate-50 rounded-md transition-colors">
                    <GripVertical className="w-4 h-4" />
                </div>

                {/* Number Badge */}
                <div className={cn(
                    "flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl font-bold text-base shadow-sm border",
                    ayah.type === 'aameen'
                        ? "bg-purple-100/50 text-purple-700 border-purple-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-100"
                )}>
                    {ayah.type === 'aameen' ? 'AM' : ayah.number}
                </div>

                {/* Content Area */}
                <div className="flex-grow flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
                    {/* Time Inputs */}
                    <div className="flex items-center gap-2">
                        <TimeInput value={ayah.start} type="start" />
                        <span className="text-slate-300">➜</span>
                        <TimeInput value={ayah.end} type="end" />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pl-2 border-l border-slate-100">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        onClick={() => onPlay(ayah.id)}
                        title="Play Segment"
                    >
                        <Play className="w-4 h-4 fill-current" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={() => onRemove(ayah.id)}
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Smart Insert Trigger */}
            <div className="absolute -bottom-3.5 left-0 right-0 h-4 flex items-center justify-center group/insert z-10 hover:z-20 cursor-pointer">
                <div className="w-full h-[1px] bg-indigo-500/20 opacity-0 group-hover/insert:opacity-100 transition-opacity absolute top-1/2 left-4 right-4"></div>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-5 px-3 rounded-full text-[10px] font-medium bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 shadow-sm opacity-0 group-hover/insert:opacity-100 transform scale-90 group-hover/insert:scale-100 transition-all"
                    onClick={() => onInsertAfter(index)}
                >
                    <Plus className="w-3 h-3 mr-1" /> Insert Segment
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
    const containerRef = useRef<HTMLDivElement>(null)

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
                height: 96, // Slightly compact
                normalize: true,
                plugins: [],
                minPxPerSec: 50, // Better zoom by default
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

        return () => {
            // Optional cleanup
        }
    }, [])

    useEffect(() => {
        if (!regionsPluginRef.current) return;
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
                    if (Math.abs(existingRegion.start - ayah.start) > 0.1 || Math.abs(existingRegion.end - ayah.end) > 0.1) {
                        existingRegion.setOptions({ start: ayah.start, end: ayah.end })
                    }
                    const color = ayah.type === 'aameen' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(79, 70, 229, 0.2)'
                    if (existingRegion && existingRegion.element && existingRegion.element.style.backgroundColor !== color) {
                        existingRegion.setOptions({ color })
                    }
                }
            }
        })

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
        setTimeout(() => {
            try {
                const decodedData = wavesurferRef.current?.getDecodedData()
                if (decodedData) {
                    const regions = detectSilentRegions(decodedData, minSilenceDuration, 0.5, silenceThreshold)
                    const newAyahs: AyahItem[] = regions.map((r, i) => ({
                        id: crypto.randomUUID(),
                        type: 'ayah',
                        number: i + 1,
                        start: r.start,
                        end: r.end
                    }))
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
            end: wavesurferRef.current ? wavesurferRef.current.getCurrentTime() + 2 : 2
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
        setAyahs(prev => reIndexAyahs(prev.filter(a => a.id !== id)))
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
        setAyahs(reIndexAyahs(newAyahs));
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
                return reIndexAyahs(arrayMove(items, oldIndex, newIndex));
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

    const playSegment = (id: string) => {
        if (!wavesurferRef.current) return
        const region = regionsPluginRef.current?.getRegions().find(r => r.id === id)
        if (region) region.play()
        else {
            const ayah = ayahs.find(a => a.id === id)
            if (ayah && ayah.start !== null && ayah.end !== null) {
                wavesurferRef.current.play(ayah.start, ayah.end)
            }
        }
    }

    const exportData = () => {
        const exportAyahs = ayahs.map(a => {
            const payload: any = { start: a.start!, end: a.end! }
            if (a.type === 'ayah') payload.ayah = a.number
            else payload.aameen = 1
            return payload
        })
        const data = {
            surah: parseInt(surahId) || 0,
            surahName,
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

    // Resize observer
    useEffect(() => {
        const handleResize = () => { if (wavesurferRef.current) setTimeout(() => wavesurferRef.current?.setTime(wavesurferRef.current.getCurrentTime()), 100) }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

            {/* 1. Header & Toolbar */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-600">SurahSync</h1>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">AUDIO ANNOTATION SUITE</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <Input
                            className="w-20 h-8 text-sm focus-visible:ring-0 border-none bg-transparent"
                            placeholder="ID"
                            type="number"
                            value={surahId}
                            onChange={(e) => setSurahId(e.target.value)}
                        />
                        <div className="w-[1px] bg-slate-300 my-1"></div>
                        <Input
                            className="w-32 h-8 text-sm focus-visible:ring-0 border-none bg-transparent"
                            placeholder="Surah Name"
                            value={surahName}
                            onChange={(e) => setSurahName(e.target.value)}
                        />
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden md:block"></div>

                    <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()} className="text-slate-600 hover:text-indigo-600 hover:border-indigo-200">
                        <FileAudio className="w-4 h-4 mr-2" />
                        {file ? 'Change Audio' : 'Upload'}
                    </Button>
                    <input id="file-upload" type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />

                    <Button onClick={exportData} disabled={!file || ayahs.length === 0} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100">
                        <Download className="w-4 h-4 mr-2" /> Export JSON
                    </Button>
                </div>
            </header>

            {/* 2. Main Content Area */}
            <main className="flex-grow flex overflow-hidden">

                {/* Left Sidebar: Settings */}
                <aside className="w-80 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto hidden md:flex flex-col">
                    <div className="p-6 space-y-8">

                        {/* Auto-Segment */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-900 font-semibold text-sm uppercase tracking-wider pb-2 border-b border-indigo-50">
                                <Wand2 className="w-4 h-4 text-indigo-500" /> Auto-Detect
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                        <span>Silence Sensitivity</span>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{Math.round(silenceThreshold * 1000)}</span>
                                    </div>
                                    <input
                                        type="range" min="0.001" max="0.1" step="0.001"
                                        value={silenceThreshold}
                                        onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-medium text-slate-500">
                                        <span>Min Pause Duration</span>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{minSilenceDuration}s</span>
                                    </div>
                                    <input
                                        type="range" min="0.1" max="2.0" step="0.1"
                                        value={minSilenceDuration}
                                        onChange={(e) => setMinSilenceDuration(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                <Button
                                    className="w-full bg-slate-900 text-white hover:bg-indigo-900 transition-all font-medium"
                                    onClick={runAutoSegment}
                                    disabled={!file || isProcessing}
                                >
                                    {isProcessing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Layers className="w-4 h-4 mr-2" />}
                                    {isProcessing ? 'Processing Audio...' : 'Run Analysis'}
                                </Button>

                                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                                    Adjust sensitivity if segments are skipped or split incorrectly.
                                </p>
                            </div>
                        </div>

                        {/* Stats / Info */}
                        {file && (
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Duration</span>
                                    <span className="font-mono font-medium">{formatTime(duration)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Segments</span>
                                    <span className="font-mono font-medium">{ayahs.length}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Workspace */}
                <div className="flex-grow flex flex-col min-w-0 bg-slate-50/50">

                    {/* Sticky Waveform Player */}
                    <div className="flex-shrink-0 bg-white border-b border-indigo-100 shadow-sm z-20 sticky top-0">
                        <div className="relative group h-32 bg-slate-900">
                            <div id="waveform" ref={waveformRef} className="w-full h-full opacity-90" />

                            {/* Controls Overlay */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-2xl transition-all opacity-0 group-hover:opacity-100">
                                <button onClick={() => wavesurferRef.current?.skip(-5)} className="text-slate-400 hover:text-white transition-colors"><SkipBack className="w-5 h-5" /></button>
                                <button onClick={togglePlayPause} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform">
                                    {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 translate-x-0.5 fill-black" />}
                                </button>
                                <button onClick={() => wavesurferRef.current?.skip(5)} className="text-slate-400 hover:text-white transition-colors"><SkipForward className="w-5 h-5" /></button>
                            </div>

                            {/* Time Display Overlay */}
                            <div className="absolute top-4 right-6 font-mono text-xs text-white/70 bg-black/20 px-2 py-1 rounded">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>

                            {!file && <div className="absolute inset-0 flex items-center justify-center text-slate-500 bg-slate-900">Upload audio to visualize</div>}
                        </div>
                    </div>

                    {/* Scrollable Ayah List */}
                    <div className="flex-grow overflow-y-auto p-4 md:p-8 relative">
                        <div className="max-w-3xl mx-auto pb-20">

                            {/* Empty State */}
                            {ayahs.length === 0 && (
                                <div className="text-center mt-20 p-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Music className="w-8 h-8 text-indigo-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-700">No Segments Yet</h3>
                                    <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Upload an audio file and run auto-detection, or add segments manually.</p>
                                    <div className="flex justify-center gap-3 mt-6">
                                        <Button variant="outline" onClick={addAyah}>
                                            <Plus className="w-4 h-4 mr-2" /> Add Manual
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* List Header */}
                            {ayahs.length > 0 && (
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Timeline</h2>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={addAyah} variant="ghost" className="text-indigo-600 hover:bg-indigo-50">
                                            <Plus className="w-4 h-4 mr-1" /> Add Segment
                                        </Button>
                                        <Button size="sm" onClick={addAameen} variant="ghost" className="text-purple-600 hover:bg-purple-50" disabled={ayahs.some(a => a.type === 'aameen')}>
                                            <Plus className="w-4 h-4 mr-1" /> Add Aameen
                                        </Button>
                                    </div>
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
                                            onPlay={playSegment}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>

                            {/* Bottom Safe Space */}
                            <div className="h-20"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
