# ChubAI Spatial System - AI Agent Instructions

## Project Overview
A **Stage-based plugin system** for ChubAI that tracks character spatial positions relative to the user during roleplay conversations. The system integrates with the `@chub-ai/stages-ts` framework to inject spatial-tracking instructions into LLM prompts, parse JSON responses, and maintain a persistent state of character coordinates.

## Architecture & Data Flow

### Core Data Structures
- **`CharacterSpatialInfo`**: `{ name, x, y, status }` - single character's position
- **`SpatialPacket`**: `{ characters: CharacterSpatialInfo[] }` - collection of all tracked characters
- **`MessageStateType`**: `{ spatialData: SpatialPacket, lastUpdate: timestamp }` - persisted per message
- **`ConfigType`**: `{ isActive: boolean }` - system on/off toggle

### Key File Responsibilities
- **Stage.tsx** (main): Implements `StageBase` lifecycle hooks; manages state & JSON parsing
- **SpatialDisplay** (component): React UI with dark theme displaying character grid (x/y coords, status)
- **App.tsx**: Routes between dev (`TestStageRunner`) and prod (`ReactRunner`) using `import.meta.env.MODE`
- **TestRunner.tsx**: Local testing harness that loads `test-init.json` and provides `runTests()` function

### Three Critical Lifecycle Hooks
1. **`beforePrompt(userMessage)`**: Injects `systemInstruction` forcing AI to output JSON between `<spatial_system>` tags at response end
2. **`afterResponse(botMessage)`**: Extracts JSON with regex, updates state, strips tags from visible message via `modifiedMessage`
3. **`render()`**: Returns `SpatialDisplay` component displaying current `myInternalState`

## Key Patterns & Conventions

### JSON Extraction (Regex-Based)
- Pattern: `/<spatial_system>([\s\S]*?)<\/spatial_system>/` (dotall mode to capture newlines)
- Extracts **first valid match** via `content.match(regex)`
- Parsing failures logged to console but don't crash; message preserved for debugging
- On success: `JSON.parse(match[1].trim())` → updates state → removes tags from chat

### State Management
- State persists across history swaps via `setState()` hook
- `myInternalState` ephemeral field holds current UI data (updates on every afterResponse)
- `lastUpdate` timestamp records when spatial JSON was last parsed
- Deduplication: characters with same name → **last occurrence wins** in array
- No character count limit in UI (unlimited display), but system designed for ~5-10 tracked chars

### Configuration
- Entire system toggled by `config.isActive` boolean in `ConfigType`
- When disabled, all hooks return `{}` (no-op behavior)

## Development Workflow

### Local Testing
- **Dev mode**: `npm run dev` loads `TestRunner.tsx` (automatically via `import.meta.env.MODE === 'development'`)
- **Test data**: `assets/test-init.json` contains Chub.ai character schema (name, description, personality, first_message, scenario)
- **Manual testing**: Uncomment test cases in `TestRunner.runTests()` function; call `stage.beforePrompt()` / `stage.afterResponse()` with mock `Message` objects
- **Forwards compatibility**: Use `DEFAULT_MESSAGE`, `DEFAULT_INITIAL` from `@chub-ai/stages-ts` to future-proof tests

### Build & Environment
- **Vite-based** project with dev/prod routing via `App.tsx`
- Prod mode: runs `ReactRunner` factory (actual Chub.ai integration)
- React Strict Mode intentionally disabled (commented out) due to Stage lifecycle patterns
- No external UI libraries; styles use inline React objects in `SpatialDisplay`

### Making Changes
1. Modify `systemInstruction` string in `beforePrompt()` to change AI prompt
2. Update `CharacterSpatialInfo` interface to add fields (e.g., distance, direction)
3. Expand `SpatialDisplay` grid to show new fields
4. Test with `TestRunner` by uncommenting `runTests()` cases

## Integration Points

### With @chub-ai/stages-ts
- Inherits from `StageBase<Init, Chat, Message, Config>` (4-type generics required)
- Implements required methods: `load()`, `setState()`, `beforePrompt()`, `afterResponse()`, `render()`
- Uses `Message` type for bot/user messages; `StageResponse` for hook returns
- Import `LoadResponse` from `dist/types/load`

### Message Cleaning
- `modifiedMessage` return field in `afterResponse()` strips spatial tags from visible chat
- Uses: `content.replace(regex, '').trim()`

## Common Tasks

### Adding New Character Fields
1. Extend `CharacterSpatialInfo` interface (e.g., `distance?: number`)
2. Update `systemInstruction` example JSON to include new field
3. Parse in `afterResponse()` when updating state (fields are optional; partial updates work)
4. Render in `SpatialDisplay` component (add grid item or row)

### Debugging AI Output
- Check browser console for `console.error("Spatial System: Failed to parse AI JSON", e)`
- If regex finds tags but JSON parse fails, the malformed JSON is logged but message stays intact
- Set `config.isActive = false` to disable the system entirely and verify base chat works

### Coordinate System Reference
- User is always at **(0, 0)**
- **X**: Horizontal; negative = left, positive = right
- **Y**: Forward depth; negative = behind, positive = in front
- Example: Character 5m to the right = `{ x: 5, y: 0 }`
- Example: Character 3m behind = `{ x: 0, y: -3 }`

## Important Caveats

- **No persistence layer**: Spatial data exists only in browser memory during session
- **Last-one-wins deduplication**: If incoming JSON has duplicate character names, the last occurrence is kept
- **Partial updates supported**: Characters can update only some fields (x, y, status); existing values not overwritten unless explicitly provided
- **First match extracted**: If AI outputs malformed tags or multiple JSON blocks, regex uses the first valid `<spatial_system>...</spatial_system>` pair
- **String coercion**: x/y can be strings like "5.5" in JSON and will parse correctly; non-numeric strings are rejected and logged
- **No state reset on config.isActive = false**: Disabling config preserves existing spatial data; re-enabling doesn't clear old state
