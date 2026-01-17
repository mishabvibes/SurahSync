# Quran Audio Annotator

A React-based web application for audio timestamp annotation. This app allows users to upload an MP3 file, visualize the waveform, and capture precise start/end timestamps for Ayahs (verses) to export as JSON.

## Features

- **Audio Player**: Interactive waveform visualization using Wavesurfer.js.
- **Dynamic Annotation**: Add Ayahs and capture start/end times with 0.01s precision.
- **Aameen Support**: Special handling for "Aameen" annotation.
- **Export**: Download the annotated data as a JSON file matching the required schema.
- **UI**: Clean, modern interface built with Tailwind CSS and Shadcn UI components.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Audio**: Wavesurfer.js
- **Icons**: Lucide React

## Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run the development server**:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Deployment to Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

1.  Push this code to a Git repository (GitHub, GitLab, or Bitbucket).
2.  Import the project into Vercel.
3.  Vercel will automatically detect Next.js and configure the build settings.
4.  Click **Deploy**.
