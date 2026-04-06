<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# StudyFlow - AI-Powered Study Dashboard

A Spotify-inspired study dashboard with AI planning, analytics, and focus mode for A/L students.

View your app in AI Studio: https://ai.studio/apps/bf7857f3-7ce2-43e2-8357-91b2d98e11dd

## Features

- AI-powered study planning and recommendations
- Real-time progress tracking with live data updates
- Interactive syllabus tracker with mastery levels
- Focus mode with timer and ambient features
- Comprehensive analytics with multiple chart types
- Badge system and achievements
- Weekly schedule management
- Study log tracking
- Exam performance tracking
- Firebase authentication with Google sign-in
- Firestore database integration with RLS

## Run Locally

**Prerequisites:**  Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key:
   ```
   GEMINI_API_KEY=your-api-key-here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Firebase Setup

The app uses Firebase for:
- Authentication (Google Sign-in)
- Firestore database for data persistence
- Real-time data synchronization

Firebase configuration is loaded from `firebase-applet-config.json`.

## Tech Stack

- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Motion (Framer Motion) for animations
- Recharts for analytics visualization
- Firebase for backend services
- Lucide React for icons
- DnD Kit for drag-and-drop functionality

## Project Structure

```
src/
├── components/     # React components
├── lib/           # Utility functions
├── types.ts       # TypeScript type definitions
├── constants.ts   # App constants and initial data
├── firebase.ts    # Firebase configuration
└── App.tsx        # Main application component
```
