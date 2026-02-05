# Homepage Improvements - Minimal Style

## Changes Made

### 1. Bio Update (_config.yml)
**Before:**
> Director of AI & Machine Learning @ Singtel | Chief AI Officer @ Heyhi | NUS Outstanding Young Alumni '21. ♥ Deep Learning and Natural Language Processing.

**After:**
> Director of AI & ML @ Singtel | Chief AI Officer @ Heyhi. Building systems that work at the intersection of deep learning and NLP.

**Why:** More personal, less cliché, flows better.

---

### 2. Accent Color Update (_sass/base/variables.sass)
**Before:**
- Link color: `$delta: #4b0082` (deep purple)
- Border/background color: `$epsilon: #ededed` (light gray)

**After:**
- Link color: `$delta: #2563eb` (modern blue)
- Border/background color: `$epsilon: #f3f4f6` (slightly darker gray)

**Why:** More modern, better contrast, professional.

---

### 3. Typography Hierarchy (_sass/base/general.sass)
**Before:**
- h1 size: 3rem

**After:**
- h1 size: 4rem
- Added `.description` class for better bio styling
- Better spacing and line-height

**Why:** Your name should be the hero element.

---

### 4. Header Improvements (_sass/components/header.sass)
**Changes:**
- Profile pic: 125px → 140px
- Added blue border around profile pic
- Better hover effect (scale + shadow)
- Name size: 4rem → 4.5rem
- Better spacing and breathing room
- Improved bio typography (size 1.9rem, max-width 700px)
- Added link hover effects

**Why:** More visual hierarchy, better focus, feels more polished.

---

### 5. Social Links Enhancement (_sass/components/social-links.sass)
**Changes:**
- Icon size: 35px → 42px
- Added background circles to each icon
- Spacing: `margin: 0 8px`
- Hover: fills icon with white on blue background
- Smooth transitions

**Why:** More interactive, better visual anchors, modern feel.

---

### 6. Navigation Polish (_sass/components/nav.sass)
**Changes:**
- Font size: 2rem → 1.8rem
- Better padding: `12px 24px`
- Added gap between items
- Rounded corners: 8px
- Hover effect: blue text + light gray background + slight lift
- Better spacing: 3rem margin-top

**Why:** Cleaner look, better touch targets, more interactive feel.

---

## How to Test Locally

If you have Jekyll installed:
```bash
cd davidlowjw.github.io
jekyll serve
```

Then visit `http://localhost:4000`

---

## How to Deploy

```bash
git add .
git commit -m "Improve homepage styling and add PRISM award news"
git push
```

GitHub Pages will automatically rebuild and deploy.

---

## What You'll See

- **Larger, bolder name** that draws focus
- **More refined bio** that sounds like you
- **Modern blue accent color** throughout
- **Better profile photo** with subtle border and hover effects
- **Social links** that feel intentional and interactive
- **Navigation** that's clean but not boring
- **News section** highlighting your recent award
- **Featured project card** showcasing PRISM

All while keeping the minimal aesthetic — no clutter, just better decisions.