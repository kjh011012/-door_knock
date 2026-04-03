Original prompt: Fix AssemblyGame floating blocks after line clear and verify in browser.

- Started local dev verification on 127.0.0.1:5174.
- Reached live app and waiting through splash screen.
- Added a render-time grid compaction safety net in AssemblyGame and removed temporary debug entry points.
- Applied workshop background image to TitleScreen with a light overlay for readability.
- Renamed workshop background asset to ASCII filename to avoid dev-server asset URL issues.
- Filtered TitleScreen sprite animation to numbered frames only so workshop background image is not treated as a frame.
- Updating visible game title branding to 딱따구리 톡톡 공방 across title, splash, and document title.
- Updated title copy to 딱따구리 톡톡 공방 / 우드 도어노커 만들기.
- Found provided title image at src/assets/woodpecker/main_top.png and will wire it into TitleScreen.
- Replaced TitleScreen text heading with provided title image main_top.png.
- Replaced Tetris-like BGM with an original child-friendly no-lyrics melody and wired it into TitleScreen after first user interaction.

[2026-03-24 22:39:57] workbench/find-parts asset refactor starting
[2026-03-24 22:43:38] swapped workbench/find-parts to shared woodpecker part images
[2026-03-24 22:57:17] verified workbench and find-parts screens in browser with provided part assets
[2026-03-24 23:21:10] replaced memory cards with hidden-object scene in FindPartsGame
[2026-03-24 23:38:19] removed idle floating animation from hidden-part buttons for click stability
[2026-03-24 23:42:56] reverted FindPartsGame from hidden-object board back to image memory-card version
[2026-04-02 19:44:15] replaced stage 1 with "Free the Part" sliding-block rescue puzzle (6 rounds, one per woodpecker part)
[2026-04-02 19:44:15] added puzzle SFX hooks (slide / blocked / rescue) and wired them into FindPartsGame interactions
[2026-04-02 19:44:15] verified production build success via `npm run build`
[2026-04-02 19:52:19] rebuilt FindPartsGame to drag-based random-box puzzle flow (no pre-shown per-part target), with harder generated boards
[2026-04-02 19:52:19] added in-stage BGM start/stop for FindPartsGame and wood-like block slide SFX
[2026-04-02 19:52:19] verified production build success via `npm run build`
[2026-04-02 20:01:58] replaced procedural puzzle generation with curated hard round templates (about 21~23 optimal moves) and shuffled round order per session
[2026-04-02 20:01:58] added strict move limit rule (limit = par+2), over-limit reset flow, and in-game warning copy
[2026-04-02 20:01:58] verified production build success via `npm run build`
[2026-04-02 20:56:17] removed move-limit reset rule and switched scoring to fixed target 25 moves (<=25 => 100, then -2 per extra move)
[2026-04-02 20:56:17] updated stage copy/score display to reflect fixed target scoring model
[2026-04-02 20:56:17] added smooth slide feel for block movement via left/top transition easing (non-drag state)
[2026-04-02 20:56:17] verified production build success via `npm run build`
[2026-04-02 21:10:35] replaced single hard-template shuffle with difficulty-tier pools and progressive round order (easy1/easy2 -> mid -> hard)
[2026-04-02 21:10:35] each round now picks a unique layout signature per session to avoid same-position repetition between rounds
[2026-04-02 21:10:35] verified production build success via `npm run build`
[2026-04-02 21:15:54] added per-round variant generation (template scramble + BFS min-move validation) for stronger layout diversity
[2026-04-02 21:15:54] kept fixed difficulty progression while randomizing each round start state within tier move ranges
[2026-04-02 21:15:54] verified production build success via `npm run build`
[2026-04-02 21:22:56] strengthened round generator to strictly reject duplicate board signatures across all 6 rounds
[2026-04-02 21:22:56] added multi-stage fallback search (scramble -> random walk -> reachable-state BFS) plus re-seed retries for unique per-round layouts
[2026-04-02 21:22:56] verified production build success via `npm run build`
[2026-04-02 21:23:52] hardened deterministic fallback path with additional random-walk uniqueness search to avoid duplicate board positions
[2026-04-02 21:23:52] re-verified production build success via `npm run build`
[2026-04-02 21:27:07] replaced sliding puzzle wood block visuals with new blk.png~blk4.png assets from src/assets/woodpecker
[2026-04-02 21:27:07] mapped target block to blk.png and non-target blocks to deterministic blk1~blk4 textures by piece id
[2026-04-02 21:27:07] verified production build success via `npm run build`
[2026-04-02 21:30:39] lowered round 1~2 target difficulty bands to easy1(4~6), easy2(6~8) for easier early progression
[2026-04-02 21:30:39] added tier-specific scramble intensity settings so easy rounds scramble much less than mid/hard rounds
[2026-04-02 21:30:39] verified production build success via `npm run build`
[2026-04-02 21:41:38] added route-diversity analysis for puzzle states (movable pieces, multi-option blocks, destination volume, axis balance)
[2026-04-02 21:41:38] updated round generation to prefer candidates with multiple opening choices and penalize repeated play-style profiles between rounds
[2026-04-02 21:41:38] wired diversity scoring into scramble/fallback selectors so each round tends to support different extraction approaches
[2026-04-02 21:41:38] verified production build success via `npm run build`
[2026-04-02 21:57:22] added per-tier block-position variation requirements so long/short blocks must shift compared to previous round
[2026-04-02 21:57:22] integrated variation penalty into all round candidate paths (main scramble + fallback walkers + deterministic fallback)
[2026-04-02 21:57:22] tightened early accept rules to require both diversity and low variation penalty
[2026-04-02 21:57:22] verified production build success via `npm run build`
[2026-04-02 22:13:58] intensified per-tier variation requirements so more long/short blocks must move each round
[2026-04-02 22:13:58] added history-based variation penalty (compare against last 2 rounds) to force stronger round-to-round layout contrast
[2026-04-02 22:13:58] increased repeated play-style penalty to reduce consecutive rounds with similar solving feel
[2026-04-02 22:13:58] applied history variation scoring to all candidate paths (main, scramble fallback, deterministic fallback)
[2026-04-02 22:13:58] verified production build success via `npm run build`
[2026-04-02 22:45:35] replaced splash loading scene with full-screen landing image (딱따구리랜딩.png) as the loading landing page
[2026-04-02 22:45:35] kept loading progress bar + rotating loading messages over bottom gradient overlay for readability
[2026-04-02 22:45:35] verified production build success via `npm run build`
[2026-04-02 22:48:33] adjusted splash landing image fit from cover to fill per request to reduce perceived oversize
[2026-04-02 22:48:33] verified production build success via `npm run build`
[2026-04-02 22:49:09] changed splash landing image fit from fill to contain per request
[2026-04-02 22:49:09] verified production build success via `npm run build`
[2026-04-02 22:56:48] lowered rounds 3~6 target move bands (mid/hard tiers) for milder late-game difficulty
[2026-04-02 22:56:48] reduced mid/hard scramble intensity (base/randomSpan/attemptScale) to ease puzzle generation outcomes
[2026-04-02 22:56:48] verified production build success via `npm run build`
[2026-04-02 23:10:52] copied provided rhythm track to ascii-safe asset path: src/assets/woodpecker/rhythm-track.mp3
[2026-04-02 23:10:52] rebuilt RhythmGame to use real mp3 playback (countdown -> synced note timing -> hit/miss judgement -> combo/accuracy/final score)
[2026-04-02 23:10:52] replaced synthetic WebAudio song generator with audio-element driven timing loop and dynamic chart generation by track duration
[2026-04-02 23:10:52] added keyboard controls (A/S/D, ArrowLeft/ArrowDown/ArrowRight) and refreshed UI flow for intro/play/results
[2026-04-02 23:10:52] verified production build success via `npm run build`
[2026-04-02 23:10:52] attempted Playwright skill-client verification; blocked because local Playwright browser binaries were not installed (`npx playwright install` needed)
[2026-04-02 23:12:01] removed temporary playwright dev dependency used for local verification attempts to keep project dependencies unchanged
[2026-04-02 23:12:01] re-verified production build success via `npm run build`
[2026-04-02 23:31:44] redesigned HammerGame into rhythm peg-in-hole mode (round wood pegs into round holes, beat-synced lane tapping, PERFECT/GOOD/MISS judgement)
[2026-04-02 23:31:44] added dedicated hammer SFX hooks (sfxHammerBeat/sfxHammerPeg/sfxHammerMiss) and wired them into new HammerGame timing loop
[2026-04-02 23:31:44] removed balance stage from game flow and scoring (App stage order, score model, OperationTest dependency)
[2026-04-02 23:31:44] updated HowTo/Result/Reward copy and score breakdown to match no-balance flow
[2026-04-02 23:31:44] switched RhythmGame track import to provided source file: src/assets/woodpecker/고라데이로 딱딱딱.mp3
[2026-04-02 23:31:44] verified production build success via `npm run build`
[2026-04-02 23:35:58] boosted RhythmGame visuals for stronger impact: lane energy glow, full-screen hit flash, camera kick, overdrive combo banner, neon note styling, and explosive hit particles
[2026-04-02 23:35:58] connected hit/miss judgement flow to new FX trigger path (tap miss + auto miss also spawn visible impact effects)
[2026-04-02 23:35:58] verified production build success via `npm run build`
[2026-04-02 23:35:58] attempted runtime visual verification via local dev server + Playwright MCP; blocked by environment issue (`ENOENT: mkdir '/.playwright-mcp'`), so only build-level verification was completed
[2026-04-02 23:39:42] replaced shared stage BGM engine to use provided track: src/assets/woodpecker/딱따구리 도어노크 체험 게임 BGM.mp3 (startBGM/stopBGM now mp3 loop playback)
[2026-04-02 23:39:42] kept existing SFX WebAudio path unchanged and wired cleanup to release BGM audio element
[2026-04-02 23:39:42] verified production build success via `npm run build`
[2026-04-02 23:44:48] removed explicit 'BGM 켜고 시작' UX: TitleScreen now calls startBGM immediately when soundOn is true
[2026-04-02 23:44:48] improved BGM autoplay fallback in tetris-sounds: if blocked, it auto-retries on any pointer/key/touch interaction without dedicated button
[2026-04-02 23:44:48] updated FindParts ready CTA text from '🎵 BGM 켜고 시작' to '▶ 퍼즐 시작하기'
[2026-04-02 23:44:48] verified production build success via `npm run build`
[2026-04-02 23:49:36] fixed pre-game BGM continuity: moved BGM ownership from TitleScreen to App-level stage effect
[2026-04-02 23:49:36] pre-game stages now keep BGM playing across splash/title/howto/workbench transitions (no stop on title unmount)
[2026-04-02 23:49:36] verified production build success via `npm run build`
[2026-04-02 23:54:22] added stage-specific BGM support to startBGM(options): custom source/volume with safe track switching
[2026-04-02 23:54:22] wired FindPartsGame to auto-play provided track (나무블럭 속삭임.mp3) on stage entry, including ready phase before pressing start
[2026-04-02 23:54:22] passed global soundOn into FindPartsGame so mute toggle is respected for auto BGM
[2026-04-02 23:54:22] verified production build success via `npm run build`
[2026-04-02 23:58:47] fixed BGM overlap on game entry: FindParts now force-stops existing BGM before starting stage track (나무블럭 속삭임.mp3)
[2026-04-02 23:58:47] pinned pre-game BGM source explicitly in App effect (DEFAULT_WORKSHOP_BGM) to avoid source carry-over between stages
[2026-04-02 23:58:47] hardened startBGM to pause/reset any other playing <audio> elements before playback, ensuring single-track playback
[2026-04-02 23:58:47] verified production build success via `npm run build`
[2026-04-03 00:02:11] adjusted FindPartsGame BGM trigger policy: removed auto-play on stage mount and start BGM only on '퍼즐 시작하기' click
[2026-04-03 00:02:11] kept cleanup-time stopBGM and added explicit stop+start sequence at startGame to guarantee single game track
[2026-04-03 00:02:11] verified production build success via `npm run build`
[2026-04-03 00:06:41] tuned FindParts BGM flow per UX: keep default workshop BGM during ready page, switch to puzzle BGM only after entering gameplay phase
[2026-04-03 00:06:41] added phase/soundOn-driven BGM effect in FindPartsGame (ready -> DEFAULT_WORKSHOP_BGM, playing/roundClear/complete -> 나무블럭 속삭임)
[2026-04-03 00:06:41] verified production build success via `npm run build`
[2026-04-03 00:16:02] added temporary DEV stage quick-jump dropdown overlay in App frame (direct stage select for rapid page-by-page design iteration)
[2026-04-03 00:16:02] dropdown currently supports all GameStage values from splash to reward and updates stage immediately on selection
[2026-04-03 00:16:02] verified production build success via `npm run build`
[2026-04-03 00:20:29] wired AssemblyGame (tetris stage) BGM to provided track: src/assets/woodpecker/Tetris-Bradinsky-tetis(mp3hamster.net).mp3
[2026-04-03 00:20:29] Assembly startGame now calls startBGM({ source: tetrisTrack, volume: 0.56 }) for stage-specific playback
[2026-04-03 00:20:29] verified production build success via `npm run build`
[2026-04-03 00:23:37] split AssemblyGame BGM by phase: ready screen now uses Tetris-NES-Karinka(mp3hamster.net).mp3
[2026-04-03 00:23:37] gameplay phases (playing/clearing/gameover) continue using Tetris-Bradinsky-tetis(mp3hamster.net).mp3
[2026-04-03 00:23:37] moved AssemblyGame BGM switching to phase-based effect and removed direct startGame BGM call
[2026-04-03 00:23:37] verified production build success via `npm run build`
[2026-04-03 00:25:06] replaced HammerGame with rhythm whack-a-mole gameplay synced to provided track: src/assets/woodpecker/두더지게임.mp3
[2026-04-03 00:25:06] added flashy hit FX pipeline (screen flash, particle burst, hammer swing), judgement/combo scoring, and hammer hit/miss/beat SFX hooks
[2026-04-03 00:25:06] updated stage copy from rhythm-pin wording to mole-game wording in HowTo/Result/Reward screens
[2026-04-03 00:25:06] verified production build success via `npm run build`
[2026-04-03 00:29:00] updated HammerGame board to 13 circular holes (3-4-3-3 layout) and switched gameplay to hole-only mole visibility via circular clipping
[2026-04-03 00:29:00] expanded keyboard mapping for 13 holes (1~0, Q/W/E) and refreshed control copy in ready panel
[2026-04-03 00:29:00] verified production build success via `npm run build`
[2026-04-03 00:31:00] fixed HammerGame hole jitter by removing board scale animation and tap-scale animation so hole positions remain fixed
[2026-04-03 00:31:00] verified production build success via `npm run build`
[2026-04-03 00:34:00] tuned HammerGame mole motion to fully emerge-hold-hide pacing (slower show/hide + full-visible hold window)
[2026-04-03 00:34:00] changed hammer icon trigger to input-only: swing appears only on user tap/key hole, not on auto misses
[2026-04-03 00:34:00] verified production build success via `npm run build`
[2026-04-03 00:37:00] further tuned HammerGame mole motion for clearer full emerge/hold/re-enter timing (show 700ms, full hold 420ms, hide 720ms)
[2026-04-03 00:37:00] changed progress display to second-only format (elapsed/total seconds), removing percent-style precision from UI
[2026-04-03 00:37:00] verified production build success via `npm run build`
[2026-04-03 00:41:00] retuned HammerGame to 10-hole wide spread layout (5 top + 5 bottom) and simplified keyboard mapping to 1~0
[2026-04-03 00:41:00] changed mole spawn pacing to time-accelerating flow (slow early, faster late) with fixed 60-second game duration
[2026-04-03 00:41:00] forced stage run-time finish at 60s and looped track during play to keep audio continuous until timer end
[2026-04-03 00:41:00] verified production build success via `npm run build`
[2026-04-03 00:44:00] changed HammerGame hole arrangement from split rows to a dense circular cluster (center + inner ring + outer ring) within screen center
[2026-04-03 00:44:00] reduced hole diameter slightly to 16% to keep circular packed layout readable without overlap artifacts
[2026-04-03 00:44:00] verified production build success via `npm run build`
[2026-04-03 00:47:00] replaced HammerGame hole geometry with a strict 10-point circular ring to remove human-like silhouette and keep pure circular formation
[2026-04-03 00:47:00] verified production build success via `npm run build`
[2026-04-03 00:51:00] switched HammerGame holes to scattered random layout generation (sprinkled across board rather than clustered ring)
[2026-04-03 00:51:00] added non-overlap distance guard + spread-biased candidate scoring for clearer here-and-there placement each run
[2026-04-03 00:51:00] random hole layout now re-rolls on each game start while keeping hole count at 10
[2026-04-03 00:51:00] verified production build success via `npm run build`
[2026-04-03 00:55:00] slowed HammerGame mole pacing further: longer emerge/hold/re-enter timing (show 1000ms, hold 760ms, hide 980ms)
[2026-04-03 00:55:00] reduced overall spawn tempo and density (slower interval curve, lower double/syncopation chance) for calmer readability
[2026-04-03 00:55:00] verified production build success via `npm run build`
[2026-04-03 00:59:00] fixed HammerGame false-miss behavior by aligning hit acceptance to mole visible window (appear->hide) instead of narrow center-only timing
[2026-04-03 00:59:00] auto-miss now triggers only after mole hide window ends, preventing MISS while mole is visibly up
[2026-04-03 00:59:00] scoring still keeps PERFECT/GREAT near center timing while visible-window taps outside center grade as GOOD
[2026-04-03 00:59:00] verified production build success via `npm run build`
[2026-04-03 01:07:00] rebuilt CustomizeScreen into full coloring mode using provided template image: src/assets/woodpecker/커스터마이징.png
[2026-04-03 01:07:00] added paint-canvas workflow (brush/eraser, color palette, brush sizes, undo/redo, clear-all, paint progress indicator)
[2026-04-03 01:07:00] kept stage-complete customization output compatible with existing game flow and added style preset buttons for downstream stages
[2026-04-03 01:07:00] verified production build success via `npm run build`
[2026-04-03 01:13:00] fixed customize controls visibility by converting tool/options area to scrollable region and adding explicit current-tool/size status
[2026-04-03 01:13:00] added bucket-fill tool with line-aware flood fill (template contour mask blocks spill-over across black outlines)
[2026-04-03 01:13:00] bucket actions integrated with undo/redo history via stroke replay pipeline
[2026-04-03 01:13:00] verified production build success via `npm run build`
[2026-04-03 01:17:00] improved CustomizeScreen tool visibility: added min-h-0 scroll container, reduced canvas max height, and compacted palette swatches
[2026-04-03 01:17:00] brush-size controls are now exposed earlier in viewport without requiring deep scroll on mobile
[2026-04-03 01:17:00] verified production build success via `npm run build`
[2026-04-03 01:21:00] improved color visibility in CustomizeScreen by separating layers (light template base + paint canvas + high-contrast line-art overlay)
[2026-04-03 01:21:00] enlarged palette swatches and added selected-color preview panel (hex shown) for clearer active color feedback
[2026-04-03 01:21:00] verified production build success via `npm run build`
[2026-04-03 01:24:00] reduced CustomizeScreen sketch/template viewport size for a smaller on-screen drawing area (maxHeight 26vh, maxWidth 78%)
[2026-04-03 01:24:00] verified production build success via `npm run build`
[2026-04-03 01:29:00] redesigned CustomizeScreen controls as right-side slide panel (open/close toggle) instead of long stacked section below canvas
[2026-04-03 01:29:00] moved color/tool/brush/undo/preset controls into panel and resized canvas area dynamically based on panel open state
[2026-04-03 01:29:00] verified production build success via `npm run build`
[2026-04-03 01:34:00] moved tool panel toggle button into color-progress bar right side to prevent overlap with panel contents
[2026-04-03 01:34:00] fixed sketch/canvas visibility by making drawing wrapper explicit width-based layout and reserving right-side space when panel is open
[2026-04-03 01:34:00] kept right slide panel behavior with full hide/show animation (`x: 0` <-> `x: 102%`)
[2026-04-03 01:34:00] verified production build success via `npm run build`
[2026-04-03 01:37:00] fixed CustomizeScreen sketch resize-on-panel-open by removing panel-dependent drawing area width/padding adjustments
[2026-04-03 01:37:00] sketch canvas now keeps constant size (maxWidth 360) regardless of tool panel open/close state
[2026-04-03 01:37:00] verified production build success via `npm run build`
[2026-04-03 01:40:00] enabled default workshop BGM autoplay in CustomizeScreen stage via startBGM(DEFAULT_WORKSHOP_BGM) with soundOn-aware effect
[2026-04-03 01:40:00] passed soundOn prop from App -> CustomizeScreen to keep mute toggle behavior consistent during coloring stage
[2026-04-03 01:40:00] verified production build success via `npm run build`
[2026-04-03 01:45:00] moved OperationTest stage to the very end of gameplay flow (now: hammer -> customize -> rhythm -> operation -> result)
[2026-04-03 01:45:00] updated App stage transitions and STAGE_ORDER to match new request (operation immediately before result)
[2026-04-03 01:45:00] verified production build success via `npm run build`
[2026-04-03 01:48:00] reordered DEV stage dropdown options to match updated flow (customize -> rhythm -> operation -> result)
[2026-04-03 01:48:00] verified production build success via `npm run build`
[2026-04-03 01:53:00] added shared countdown SFX `sfxCountdownTick(count)` to tetris-sounds for 3/2/1 cues
[2026-04-03 01:53:00] wired countdown tick SFX to HammerGame and RhythmGame countdown transitions (3 -> 2 -> 1)
[2026-04-03 01:53:00] verified production build success via `npm run build`
[2026-04-03 02:12:00] updated result/reward stage normalization: toStageScore1000 now accepts both legacy 0~100 and new 0~1000 inputs
[2026-04-03 02:12:00] removed RhythmGame woodpecker visuals (intro + in-play icon) and simplified props usage in App
[2026-04-03 02:12:00] removed OperationTest flow from stage routing; rhythm now transitions directly to result
[2026-04-03 02:12:00] verified production build success via `npm run build`
[2026-04-03 02:12:00] retuned AssemblyGame to timed clear mode: 2-minute limit, subtle speed-up after 40s, timeout fail state
[2026-04-03 02:12:00] AssemblyGame final score now 0~1000 based only on clear time within 2 minutes; HUD/result copy updated to match
[2026-04-03 02:12:00] retuned HammerGame to 1000-point max deduction model (start at 1000; mistap/auto-miss deduct), final result now matches live score
[2026-04-03 02:12:00] verified production build success via `npm run build`
[2026-04-03 02:22:00] retuned RhythmGame to 1000-point max deduction model (start at 1000; mistap and note MISS deduct), and result now outputs /1000 score
[2026-04-03 02:22:00] updated RhythmGame HUD/result score labels to explicit /1000 format for consistency with stage scoring
[2026-04-03 02:22:00] renamed reward badge tiers to medal ranks as requested: 5등/4등/3등/2등/1등 메달
[2026-04-03 02:22:00] verified production build success via `npm run build`
[2026-04-03 02:31:00] FindPartsGame scoring updated per-round targets (25/24/23/22/21/20) with -2 per move over target; live round score display added; reset button removed
[2026-04-03 02:31:00] verified production build success via `npm run build`
