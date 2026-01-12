# Flip Login/Register - State Diagram

## Mobile View State Machine (0-768px)

```
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE CONTAINER                         │
│                  #flip-container                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                                                     │     │
│  │         STATE 1: Default / flip-close              │     │
│  │                                                     │     │
│  │  ┌──────────────────────────────────────┐          │     │
│  │  │                                       │          │     │
│  │  │        LOGIN FORM                     │          │     │
│  │  │        (.flip-login)                  │          │     │
│  │  │                                       │          │     │
│  │  │  - opacity: 1                         │          │     │
│  │  │  - visibility: visible                │          │     │
│  │  │  - z-index: 2                         │          │     │
│  │  │  - position: relative                 │          │     │
│  │  │                                       │          │     │
│  │  │  [Email Input]                        │          │     │
│  │  │  [Password Input]                     │          │     │
│  │  │  [Log In Button]                      │          │     │
│  │  │                                       │          │     │
│  │  │  ┌──────────────────────────────┐    │          │     │
│  │  │  │ [Register Button]            │    │          │     │
│  │  │  └──────────────────────────────┘    │          │     │
│  │  │           │                           │          │     │
│  │  └───────────┼───────────────────────────┘          │     │
│  │              │ onClick                               │     │
│  │              │ → container.className = 'flip-active' │     │
│  │              ▼                                       │     │
│  │  ┌──────────────────────────────────────┐          │     │
│  │  │                                       │          │     │
│  │  │        REGISTER FORM                  │          │     │
│  │  │        (.flip-register)               │          │     │
│  │  │                                       │          │     │
│  │  │  - opacity: 0                         │          │     │
│  │  │  - visibility: hidden                 │          │     │
│  │  │  - z-index: 1                         │          │     │
│  │  │  - position: absolute                 │          │     │
│  │  │  - transform: scale(0.9)              │          │     │
│  │  │                                       │          │     │
│  │  │  (Hidden - not visible)               │          │     │
│  │  │                                       │          │     │
│  │  └───────────────────────────────────────┘          │     │
│  │                                                     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                          ↓ User clicks "Register" button

┌─────────────────────────────────────────────────────────────┐
│                     MOBILE CONTAINER                         │
│                  #flip-container.flip-active                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                                                     │     │
│  │         STATE 2: flip-active                       │     │
│  │                                                     │     │
│  │  ┌──────────────────────────────────────┐          │     │
│  │  │                                       │          │     │
│  │  │        LOGIN FORM                     │          │     │
│  │  │        (.flip-login)                  │          │     │
│  │  │                                       │          │     │
│  │  │  - opacity: 0                         │          │     │
│  │  │  - visibility: hidden                 │          │     │
│  │  │  - z-index: 1                         │          │     │
│  │  │  - transform: scale(0.9)              │          │     │
│  │  │                                       │          │     │
│  │  │  (Hidden - not visible)               │          │     │
│  │  │                                       │          │     │
│  │  └───────────────────────────────────────┘          │     │
│  │              ▲                                       │     │
│  │              │ onClick                               │     │
│  │              │ ← container.className = 'flip-close'  │     │
│  │              │                                       │     │
│  │  ┌──────────────────────────────────────┐          │     │
│  │  │                                       │          │     │
│  │  │        REGISTER FORM                  │          │     │
│  │  │        (.flip-register)               │          │     │
│  │  │                                       │          │     │
│  │  │  - opacity: 1                         │          │     │
│  │  │  - visibility: visible                │          │     │
│  │  │  - z-index: 2                         │          │     │
│  │  │  - position: absolute                 │          │     │
│  │  │  - transform: scale(1)                │          │     │
│  │  │                                       │          │     │
│  │  │  [Business Name Input]                │          │     │
│  │  │  [First Name Input]                   │          │     │
│  │  │  [Last Name Input]                    │          │     │
│  │  │  [Email Input]                        │          │     │
│  │  │  [Password Input]                     │          │     │
│  │  │  [Register Button]                    │          │     │
│  │  │                                       │          │     │
│  │  │  ┌──────────────────────────────┐    │          │     │
│  │  │  │ [Log In Button]              │    │          │     │
│  │  │  └──────────────────────────────┘    │          │     │
│  │  │                                       │          │     │
│  │  └───────────────────────────────────────┘          │     │
│  │                                                     │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Desktop View Layout (769px+)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          DESKTOP CONTAINER                                  │
│                       #flip-container (800px wide)                          │
│                                                                             │
│  ┌─────────────────────────────────┬─────────────────────────────────────┐ │
│  │                                  │                                     │ │
│  │    LOGIN FORM                    │    FLIP PANEL (FRONT)               │ │
│  │    (.flip-login)                 │    (.flip-page.flip-front)          │ │
│  │                                  │                                     │ │
│  │  - width: 50%                    │  - width: 50%                       │ │
│  │  - left: 0                       │  - right: 0                         │ │
│  │  - border-radius: 20px 0 0 20px  │  - z-index: 3                       │ │
│  │  - Always visible                │  - Orange gradient                  │ │
│  │  - opacity: 1                    │  - rotateY(0deg)                    │ │
│  │                                  │                                     │ │
│  │  [Email Input]                   │      ┌─────────────┐                │ │
│  │  [Password Input]                │      │  👤 Icon    │                │ │
│  │  [Remember me] [Forgot password] │      └─────────────┘                │ │
│  │  [Log In Button]                 │                                     │ │
│  │                                  │   "Hello, friend!"                  │ │
│  │  Or Connect with                 │                                     │ │
│  │  [Social Icons]                  │   "Enter your personal details      │ │
│  │                                  │    and start journey with us"       │ │
│  │                                  │                                     │ │
│  │                                  │   ┌───────────────────────┐         │ │
│  │                                  │   │   [Register Button]   │         │ │
│  │                                  │   │   ← Click triggers    │         │ │
│  │                                  │   │      flip animation   │         │ │
│  │                                  │   └───────────────────────┘         │ │
│  │                                  │                                     │ │
│  └─────────────────────────────────┴─────────────────────────────────────┘ │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘

                       ↓ User clicks "Register" button
                       (Flip panel rotates -180deg)

┌────────────────────────────────────────────────────────────────────────────┐
│                          DESKTOP CONTAINER                                  │
│                   #flip-container.flip-active (800px wide)                  │
│                                                                             │
│  ┌─────────────────────────────────┬─────────────────────────────────────┐ │
│  │                                  │                                     │ │
│  │    FLIP PANEL (BACK)             │    REGISTER FORM                    │ │
│  │    (.flip-page.flip-back)        │    (.flip-register)                 │ │
│  │                                  │                                     │ │
│  │  - width: 50%                    │  - width: 50%                       │ │
│  │  - left: 0                       │  - right: 0                         │ │
│  │  - z-index: 2                    │  - border-radius: 0 20px 20px 0     │ │
│  │  - Red gradient                  │  - Always visible                   │ │
│  │  - rotateY(-180deg)              │  - opacity: 1                       │ │
│  │  - Content rotated back          │                                     │ │
│  │                                  │  [Business Name Input]              │ │
│  │      ┌─────────────┐             │  [First Name Input]                 │ │
│  │      │  🔓 Icon    │             │  [Last Name Input]                  │ │
│  │      └─────────────┘             │  [Email Input]                      │ │
│  │                                  │  [Password Input]                   │ │
│  │   "Welcome Back!"                │  [Confirm Password Input]           │ │
│  │                                  │  ☐ I accept terms                   │ │
│  │   "To keep connected with us     │  [Register Button]                  │ │
│  │    please login with your        │                                     │ │
│  │    personal info"                │  Or Connect with                    │ │
│  │                                  │  [Social Icons]                     │ │
│  │   ┌───────────────────────┐      │                                     │ │
│  │   │   ← [Log In Button]   │      │                                     │ │
│  │   │   Click triggers      │      │                                     │ │
│  │   │   flip back           │      │                                     │ │
│  │   └───────────────────────┘      │                                     │ │
│  │                                  │                                     │ │
│  └─────────────────────────────────┴─────────────────────────────────────┘ │
│                                                                             │
│  NOTE: Login form (.flip-login) is still there on the left,                │
│        but hidden behind flip panel                                        │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

## CSS State Table

### Mobile States (0-768px)

| State Class | Login Form | Register Form | Flip Panels |
|-------------|------------|---------------|-------------|
| **Default** (no class) | ✅ Visible (z:2, opacity:1, scale:1) | ❌ Hidden (z:1, opacity:0, scale:0.9) | Hidden |
| **flip-close** | ✅ Visible (z:2, opacity:1, scale:1) | ❌ Hidden (z:1, opacity:0, scale:0.9) | Hidden |
| **flip-active** | ❌ Hidden (z:1, opacity:0, scale:0.9) | ✅ Visible (z:2, opacity:1, scale:1) | Hidden |

### Desktop States (769px+)

| State Class | Login Form | Register Form | Flip Panel Front | Flip Panel Back |
|-------------|------------|---------------|------------------|-----------------|
| **Default** (no class) | ✅ Left side (50%) | ✅ Right side (50%, behind front) | ✅ Right side (z:3, rotateY:0°) | 🔄 Right side (z:2, rotateY:0°) |
| **flip-close** | ✅ Left side (50%) | ✅ Right side (50%, behind front) | ✅ Right side (z:3, rotateY:0°) | 🔄 Right side (z:2, rotateY:0°) |
| **flip-active** | ✅ Left side (50%, behind back) | ✅ Right side (50%) | 🔄 Right side (z:3, rotateY:-180°) | ✅ Right side (z:2, rotateY:-180°) |

### Legend
- ✅ = Fully visible and interactive
- ❌ = Hidden (opacity:0, visibility:hidden)
- 🔄 = Transitioning/Flipped

## Button Mapping

### Mobile (0-768px)

| Button ID | Location | Action |
|-----------|----------|--------|
| `mobile-register-btn` | Below login form | Sets `flip-active` → Shows register form |
| `mobile-login-btn` | Below register form | Sets `flip-close` → Shows login form |
| `flip-register-btn` | Hidden in mobile | N/A |
| `flip-login-btn` | Hidden in mobile | N/A |

### Desktop (769px+)

| Button ID | Location | Action |
|-----------|----------|--------|
| `flip-register-btn` | Front flip panel (right side) | Sets `flip-active` → Flips panel to reveal register |
| `flip-login-btn` | Back flip panel (right side) | Sets `flip-close` → Flips panel back to reveal login |
| `mobile-register-btn` | Hidden in desktop | N/A |
| `mobile-login-btn` | Hidden in desktop | N/A |

## Animation Timings

```css
transition: opacity 0.4s ease,
            transform 0.4s ease,
            visibility 0.4s;
```

**Mobile (fade + scale)**:
- Duration: 400ms
- Easing: ease
- Properties: opacity, transform (scale), visibility

```css
transition: transform 0.6s ease-in-out;
```

**Desktop (3D flip)**:
- Duration: 600ms
- Easing: ease-in-out
- Property: transform (rotateY)

## Z-Index Stack (Desktop)

```
Layer 4: (Nothing)
Layer 3: .flip-page.flip-front (orange panel)
Layer 2: .flip-page.flip-back (red panel) + .flip-register (register form)
Layer 1: .flip-login (login form)
Layer 0: Background (#e9ebee)
```

When flipped:
- Front panel rotates -180° (showing back side, which is invisible)
- Back panel rotates -180° (revealing its front side with "Welcome Back" message)
- Register form becomes fully visible on right
- Login form remains on left (but partially hidden by flipped panel)

## Responsive Breakpoint Logic

```
if (viewport-width <= 768px) {
  // MOBILE MODE
  - Show login OR register (stacked, one at a time)
  - Hide flip panels
  - Show mobile toggle buttons
  - Use opacity + scale transitions
}

if (viewport-width >= 769px) {
  // DESKTOP MODE
  - Show login AND register (side-by-side)
  - Show flip panels on right
  - Hide mobile toggle buttons
  - Use 3D rotateY transitions
}
```

**No JavaScript needed for responsive behavior** - CSS media queries handle everything!

## Key Improvements Over Previous Version

### Before (Buggy)
1. ❌ Mixed mobile and desktop styles with complex conditionals
2. ❌ JavaScript resize handlers causing race conditions
3. ❌ Only used `opacity` for hiding (allowed ghost clicks)
4. ❌ Unclear z-index management
5. ❌ Forms could overlap during transitions

### After (Fixed)
1. ✅ Clean separation: mobile base + desktop overrides
2. ✅ Zero JavaScript for responsive behavior
3. ✅ Triple-state hiding: opacity + transform + visibility
4. ✅ Explicit z-index for each state
5. ✅ No overlaps possible - visibility ensures clean transitions

---

**Visual Summary**:
- **Mobile**: One form at a time, simple fade/scale transition
- **Desktop**: Both forms always visible, fancy 3D flip panel overlay
- **Responsive**: Pure CSS, no JavaScript resize handling
- **Performance**: GPU-accelerated transforms, smooth 60fps
