# Task 2 - Fix Production Issues in expo-app

## Agent: main

## Changes Made

### 1. Strip console.log in production via babel plugin
- **File**: `expo-app/babel.config.js`
- `babel-plugin-transform-remove-console` was NOT installed, so added a custom inline Babel plugin (`removeConsolePlugin`)
- The plugin uses AST visitor pattern to remove `console.log`, `console.info`, and `console.debug` calls while preserving `console.warn` and `console.error`
- Only active when `NODE_ENV === 'production'`

### 2. Fix eas.json
- **File**: `expo-app/eas.json`
- Added `"RNMAPBOX_MAPS_DOWNLOAD_TOKEN": ""` to all 4 build profiles (development, preview, production, apk)
- Empty string value means the actual token must be set via `eas secret:create` — the env var key is declared but not hardcoded
- Changed production profile `distribution` from `"internal"` to `"store"`

### 3. Clean up duplicate root-level files
- **Removed directories**: auth/, services/, health/, shopping/, wallet/, delivery/, profile/, screens/, navigation/, (tabs)/
- **Removed files**: App.tsx, index.tsx, _layout.tsx, minimal-test.tsx
- **Important**: Before deleting services/, discovered that `app/auth/` files (login, register, forgot-password, reset-password) imported from `../../services/auth`
- **Fix**: Moved `services/auth.ts` → `src/services/auth.ts`, fixed internal relative imports, updated 4 app/auth/ files to import from `@/src/services/auth`, added auth re-exports to `src/services/index.ts`

### 4. Fix chatStore mock data fallback
- **File**: `expo-app/src/store/chatStore.ts`
- Removed `MOCK_CONVERSATIONS` array (4 fake conversations) and `MOCK_MESSAGES` object (12+ fake messages)
- Replaced fallback from `MOCK_CONVERSATIONS` → `[]` in `loadConversations`
- Replaced fallback from `MOCK_MESSAGES[conversationId]` → `[]` in `loadMessages`
- Changed `console.log` to `console.warn` for API failure messages
- Removed `console.log('[CHAT-STORE] Store initialized')` at end of file
