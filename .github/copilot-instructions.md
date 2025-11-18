# Copilot Instructions for Location-Based Gamified Task Platform

## Project Overview
This is a React Native (Expo) mobile app with a gamified location-based task system. Users complete tasks at physical locations, earn XP, level up, and unlock avatar customization items. Features include real-time group navigation, trust scoring, moderation systems, and a corridor navigation 3D viewer.

## Tech Stack & Architecture
- **Frontend**: React Native 0.81.5, Expo 54, expo-router 6 (file-based routing)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **3D**: Three.js with @react-three/fiber for corridor navigation
- **State**: React hooks + Supabase realtime subscriptions
- **TypeScript**: Strict mode enabled, path alias `@/*` for workspace root

## Key Development Commands
```bash
npm run dev              # Start Expo dev server
npm run android          # Run on Android
npm run ios              # Run on iOS
npm run build:web        # Export web build
npm install --legacy-peer-deps  # Install dependencies (required due to peer dep conflicts)
npx expo doctor          # Check project health and dependencies
npx expo start -c        # Start with cleared Metro cache
npx expo-doctor          # Alternative health check tool
```

## Critical Development Gotchas

### Platform-Specific Issues
- **Native modules break web builds**: `react-native-maps`, `expo-location`, `expo-camera` are not web-compatible
- **Workaround pattern**: Wrap in Platform checks or comment out for web builds (see `app/LiveMapScreen.tsx`, `app/RewardMapScreen.tsx`)
- **Metro bundler crashes**: Often caused by native module imports - use simplified components for debugging

### Dependency Management
- **ALWAYS use**: `npm install --legacy-peer-deps` due to React Native peer dependency conflicts
- **TypeScript config**: Expo auto-modifies tsconfig.json - don't fight the `expo/tsconfig.base` extension

### Screen Architecture Pattern
All screens in `app/` follow this exact structure:
```tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ScreenName() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('table_name')
      .select('*')
      .eq('user_id', user.data.user.id);
    setData(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screen Title</Text>
      {/* Content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
});
```

### Expo Router Structure
- `app/_layout.tsx`: Root stack layout
- `app/(tabs)/_layout.tsx`: Tab navigation with Lucide icons
- `app/(tabs)/index.tsx`: Main map/3D screen (currently simplified due to native module conflicts)
- `app/(tabs)/locations.tsx`: POI browser with floor filtering
- `app/(tabs)/profile.tsx`: User profile with admin controls
- 40+ standalone screens: Direct file-based routing (e.g., `app/AdminPanelScreen.tsx` → `/AdminPanelScreen`)

## Core Domain Logic

### Mock Development Support
- **Offline development**: All Supabase calls have mock fallbacks when env vars missing
- **Demo user**: `lib/auth.ts` returns demo-user-123 for testing without backend
- **Mock data patterns**: `supabase.ts` returns empty arrays/null for all operations when unconfigured

### XP & Leveling System
- **Formula**: `level = Math.floor(Math.sqrt(xp / 10))` (see `lib/levelLogic.ts`, `utils/xpUtils.ts`)
- **Max level**: 80 (unlocks special rewards via `app/TaskCompletionHandler.ts`)
- **XP sources**: Tasks (10-50 XP), photos (5-15 XP), badges (20-30 XP), chests (5-40 XP)
- **Progression**: `config/xpThresholds.ts` defines milestone thresholds [0, 100, 250, 500, 1000, 2000, 4000, 7000, 10000]

### Trust & Moderation
- **Trust Score**: 0-100, calculated from approved/rejected content + flags (see `lib/userTrust.ts`, `utils/trustUtils.ts`)
- **Thresholds**: 
  - 60+ & level 10+ → can suggest content
  - 80+ & level 20+ → moderator eligibility
  - <20 → user restrictions triggered
- **Moderator badges**: Earned at 10, 30, 100 approved tasks (see `lib/moderatorLogic.ts`)
- **Anti-abuse**: Detects spam (5+ duplicate messages), task farming (3+ identical tasks), duplicate uploads by hash (see `lib/antiAbuse.ts`)

### User Roles & Permissions
- **Roles**: `admin` | `moderator` | `runner` | `user` (see `types/userModels.ts`)
- **Access control**: `lib/roleRules.ts` - admins can hide users, moderators approve content, runners/users complete tasks
- **Gender changes**: Limited to 3 times, then requires admin approval + 200 XP penalty (see `app/ProfileEditScreen.tsx`, `lib/adminApproval.ts`)

### Location & Proximity
- **Visibility radius**: Level-dependent (see `lib/userVisibility.ts`) - higher level = see users farther away
- **Task recommendations**: `lib/taskRecommender.ts` filters by proximity (100m or 500m based on level 40+), user interests, and task expiry
- **Live map**: `app/LiveMapScreen.tsx` shows nearby users/tasks, updates every 5s

### Group Features
- **Group level**: `Math.floor(Math.sqrt(totalXp / 100))` (see `lib/groupProgress.ts`)
- **Chest unlocks**: Trigger when group level increases (see `lib/groupChest.ts`)
- **Group navigation**: Real-time grid positioning with Supabase realtime (`app/GroupNavigationScreen.tsx`)

## File Structure Patterns

### Screen Files (`app/*.tsx`)
- All screens use `export default function ScreenName()` pattern
- Styles defined with `StyleSheet.create()` at bottom of file
- Supabase auth pattern: `const user = await supabase.auth.getUser()`
- Data fetching in `useEffect()` hooks with cleanup on unmount

### Business Logic (`lib/*.ts`)
- Pure functions organized by domain (e.g., `taskRules.ts`, `levelLogic.ts`)
- Validation functions named `isValid*()` or `can*()`
- Calculation functions named `calculate*()` or `get*()`
- Type imports from `types/` directory

### Types (`types/*.ts`)
- Shared across app via `types/index.ts` barrel export
- Domain-specific models: `userModels.ts`, `taskModels.ts`, `badgeModels.ts`, etc.
- Base types: `UserRole`, `SpaceType`, `TaskStatus` (see `types/models.ts`)

## Supabase Patterns

### Environment Setup
```typescript
// Required env vars (see lib/supabase.ts)
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Authentication
- **Mock fallback**: Returns demo user if Supabase not configured (see `lib/auth.ts`)
- **Auth flow**: Google OAuth on native, email/password fallback on web
- **Session**: Auto-refresh enabled, persists across app restarts

### Database Access
- **RLS policies**: JWT claims control access (`auth.uid()`, `auth.jwt() ->> 'user_role'`, `auth.jwt() ->> 'tenant_id'`)
- **Example**: `lib/docs/rls_tasks.md` documents task table policies
- **Realtime**: Subscribe to changes with `.channel().on('postgres_changes', ...)` (see `app/GroupNavigationScreen.tsx`)

### SQL Scripts
- Extensive schema in `lib/sql/` covering 100+ tables (audit logs, feedback systems, notifications, etc.)
- Grant patterns: `grant select on table to anon` for public, `grant all on table to authenticated` for logged-in users

## Navigation & Routing

### Expo Router Structure
- `app/_layout.tsx`: Root layout with `<Stack />`
- `app/(tabs)/_layout.tsx`: Bottom tab navigation
- Main tabs: `index.tsx` (Map/3D), `locations.tsx` (POI list), `profile.tsx` (User profile)
- 40+ standalone screens for features (tasks, groups, admin, etc.)

### 3D Corridor Navigation
- **Entry point**: `app/(tabs)/index.tsx` (MapTabScreen)
- **Components**: `corridor-editor/components/` (Corridor3D, MiniMap, ControlPanel)
- **Real navigation**: Uses `expo-location` to track heading + GPS, calculates bearing to target
- **Target**: Hardcoded to "Izmir Şehir Hastanesi Girişi" at 38.4613, 27.2069
- **Arrival threshold**: 20 meters
- **Native/Web split**: Components have `.native.tsx` and `.tsx` variants for platform compatibility

## Common Gotchas

1. **Native-only modules**: `react-native-maps`, `expo-location`, `expo-camera` break web builds - wrap in Platform checks or comment out (see `app/LiveMapScreen.tsx` example)
2. **Peer dependencies**: Always use `npm install --legacy-peer-deps`
3. **Path imports**: Use `@/*` for root imports (e.g., `import { supabase } from '@/lib/supabase'`)
4. **XP validation**: Task XP capped at 500 (`lib/taskRules.ts`), always validate before awarding
5. **Trust score updates**: Call `lib/trustRules.ts` functions after approval/rejection actions
6. **Duplicate logic**: Multiple level calculation functions exist (`lib/levelLogic.ts`, `utils/xpUtils.ts`, `config/xpThresholds.ts`) - prefer `levelLogic.ts` for consistency

## Testing & Development

### Mock Data
- Supabase client returns mock responses when env vars missing
- Auth service returns demo user for offline dev (see `lib/auth.ts`)

### Debugging
- Check `get_errors` tool for TS/lint issues
- Use `semantic_search` to find similar patterns in 40+ screen files
- Location-based features need physical device or simulator with GPS mocking
- Use `npx expo start -c` to clear Metro cache when bundler crashes

## Extending the System

### Adding a New Screen
1. Create `app/NewScreen.tsx` with default export function
2. Add screen-specific types to `types/`
3. Implement business logic in `lib/` as pure functions
4. Use existing patterns: `useEffect` for data fetch, `StyleSheet.create()` for styles
5. Add to navigation via expo-router file structure

### Adding XP Events
1. Define event type in `lib/xpEvents.ts`
2. Add XP value in `getXpForEvent()` switch
3. Call from screen after action completion
4. Update trust score if applicable (see `lib/trustRules.ts`)

### New Admin Features
1. Add role check via `lib/roleRules.ts`
2. Update `app/AdminPanelScreen.tsx` or `app/ModerationPanelScreen.tsx`
3. Document RLS policies in `lib/docs/` if database changes needed

## Platform-Specific Development Notes

### React Native vs Web Compatibility
- **Native-only modules**: `react-native-maps`, `expo-location`, `expo-camera`, `@react-three/fiber` (3D)
- **Component splitting pattern**: Create `.native.tsx` and `.tsx` versions (see `corridor-editor/components/`)
- **Platform checks**: Use `Platform.OS === 'web'` to conditionally render components
- **Web fallbacks**: Provide simplified UI when native features unavailable

### Corridor Editor 3D System
- **Standalone app**: `corridor-editor/` contains separate Vite + React web app
- **Shared types**: `corridor-editor/types.ts` defines 3D navigation interfaces
- **Component structure**: `Corridor3D`, `MiniMap`, `ControlPanel` with platform variants
- **Integration**: Main app imports 3D components for immersive navigation experience
