# Implementation Plan: 'See More' Features Hub & Dedicated Cave AI Integration

## Title & Summary
Add a "See More" (সব দেখুন) button to the top-right corner of the "Features & Tools" (ফিচার ও টুলস) box in the Profile/App view. Clicking it opens a dedicated "All Features & Tools" full-page view featuring categorized Islamic utilities and a dedicated "Cave AI" companion card styled like the Quran card, while streamlining Help & Support.

## User Review & Critical Decisions

> [!IMPORTANT]
> Key decisions confirmed with user:
> - **All Features Presentation**: Full-page dedicated view with header, back button, and categorical organization.
> - **Cave AI Feature Entry**: Prominently styled companion card (matching the Quran card design) that directly launches the interactive Cave Companions AI Guide.
> - **Help & Support Scope**: Cave AI is migrated exclusively to the All Features page, keeping Help & Support cleanly focused on Customer Tickets and FAQ resolution.

- **Confirmed Decision 1**: Dedicated full page view with smooth back navigation (`activeTab === 'all_features'`).
- **Confirmed Decision 2**: Cave AI featured as an Islamic companion tile styled consistently with Quran, Tasbih, and Hisnul Muslim.
- **Confirmed Decision 3**: Help & Support view streamlined to support tickets and FAQs.

---

## 1. Overview & Core Concept

### What It Does
1. **"See More" Action in Features & Tools Box**: Adds a clean, accessible `See More` / `সব দেখুন` button in the upper-right corner of the Feature & Tools section in `ProfileView` (and home dashboard if applicable) with a chevron icon and hover feedback.
2. **Dedicated "All Features" Hub (`AllFeaturesView`)**: A clean, mobile-first view displaying the complete suite of Cave Companions tools categorized into:
   - **স্মার্ট সহকারী ও দ্বীনি গাইড (AI & Guidance)**: Featuring **Cave AI** with a dedicated tile styled identically to Quran, featuring rich emerald-gold accents.
   - **দৈনন্দিন ইবাদত ও সালাত (Daily Worship & Prayer)**: ৫ ওয়াক্ত সালাত, জামা'আত ট্র্যাকার, কাজা সালাত ক্যালকুলেটর, সেহরি ও ইফতার ক্যালেন্ডার, নামাজের রিমাইন্ডার।
   - **কুরআন ও যিকর (Quran & Remembrance)**: কুরআন মাজীদ (অনুবাদ ও তাফসির), ডিজিটাল তাসবীহ (কাউন্টার ও হিস্ট্রি), হিসনুল মুসলিম (সহিহ দু'আ ও আজকার)।
   - **উম্মাহ ও সমাজ (Community & Utilities)**: কেভ সার্কেল (দ্বীনি হালক্বা), কিবলা কম্পাস, নিকটস্থ মসজিদ ফাইন্ডার, কেভ মিডিয়া (ভিডিও ও লেকচার)।
   - **বারাকাহ অর্থনীতি (Rewards & Economy)**: ফেইথ টোকেন রিওয়ার্ডস, পার্টনার শপ ভাউচার মার্কেট।
3. **Cave AI Dedicated Navigation (`activeTab === 'cave_ai'`)**: Clicking the Cave AI button smoothly opens the full interactive `CaveCompanionsGuideView` with back button returning to `all_features` or previous view.
4. **Streamlined Help & Support (`SupportView`)**: Removes the 'guide' tab from SupportView, restoring its primary purpose: Help FAQ, Submit Ticket, and My Tickets.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Flow A (Discovery)**: User scrolls to "Features & Tools" (ফিচার ও টুলস) box -> Notices "সব দেখুন / See More →" in the top-right corner -> Clicks button -> Smoothly navigates to the dedicated All Features view.
2. **Flow B (Cave AI Launch)**: On the All Features page, user spots the "Cave AI (কেভ এআই)" companion tile (highlighted with gold-emerald border and sparkles) -> Taps Cave AI -> Instant access to the local AI Guide with Bengali & English Q&A and instant feature deep-links.
3. **Flow C (Back Navigation)**: Back button in All Features top navigation returns user to Profile/Home. Back button in Cave AI returns user to All Features.

### Visual Identity & Layout Math
- **Aesthetic Direction**: Islamic emerald & dark slate palette (`#021812`, `#04241b`, `#072c21`, border `#0d4737`, accents `#f59e0b` amber and `#10b981` emerald).
- **Touch Target Ergonomics**: All interactive cards and buttons have $\ge 48\text{px}$ touch hitbox, active tactile scale feedback (`active:scale-95`), and smooth state transitions.
- **Header "See More" Button**: Clean typography with subtle hover glow (`text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer transition-colors`).
- **Feature Tiles**: Consistent with the app's established design language:
  - Outer container: `bg-[#031d16] hover:bg-[#052b20] border border-[#0b4233] hover:border-amber-400/50 rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs`.
  - Icon container: `w-11 h-11 rounded-full flex items-center justify-center bg-[#072c21] border border-[#0f543e] text-amber-400`.
  - Label: `text-xs font-bold text-slate-100 group-hover:text-amber-200`.

---

## 3. Technical Architecture & Data Strategy

### Architecture & Navigation Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    ProfileView / Home                        │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ফিচার ও টুলস (Features & Tools)      [ সব দেখুন / See More → ] │ │
│ └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬──────────────────────────────┘
                                │ onNavigateTab('all_features')
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                     AllFeaturesView                          │
│  [ ← ফিরে যান ]     সকল ফিচার ও টুলস (All Features)          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🌟 স্মার্ট সহকারী ও গাইড (AI Assistant & Guide)         │  │
│  │  ┌───────────────┐ ┌───────────────┐                  │  │
│  │  │   Cave AI     │ │ Quran Guide   │                  │  │
│  │  │   (কেভ এআই)   │ │  (আমল গাইড)   │                  │  │
│  │  └───────┬───────┘ └───────────────┘                  │  │
│  └──────────┼─────────────────────────────────────────────┘  │
│             │ onClick -> onNavigateTab('cave_ai')            │
│  ┌──────────▼─────────────────────────────────────────────┐  │
│  │ 🕌 কুরআন, সালাত ও দৈনন্দিন আমল                         │  │
│  │  [কুরআন] [তাসবীহ] [হিসনুল মুসলিম] [কিবলা] [নামাজ ট্র্যাকার] │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 👥 উম্মাহ, সমাজ ও অর্থনীতি                             │  │
│  │  [কেভ সার্কেল] [মসজিদ] [কেভ মিডিয়া] [ফেইথ টোকেন] [শপ]  │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│               CaveCompanionsGuideView (Cave AI)              │
│  [ ← ফিরে যান ]   Cave AI স্মার্ট সহকারী                     │
│  - ১০০% লোকাল ও অফলাইন ইসলামিক গাইড                          │
│  - বাংলা ও ইংরেজি ন্যাচারাল ল্যাঙ্গুয়েজ সার্চ                │
│  - ইনস্ট্যান্ট ফিচার নেভিগেশন একশন বাটন                      │
└──────────────────────────────────────────────────────────────┘
```

### Component & Routing Changes
1. **`src/types.ts`**:
   - Add `'all_features'` and `'cave_ai'` to `ActiveTab` union.
2. **`src/components/ProfileView.tsx`**:
   - In the "Features & Tools" section header (line 434), add a flex row with `See More` (`সব দেখুন`) link button positioned at the top right corner.
   - Clicking triggers `onNavigateTab('all_features')`.
3. **`src/components/AllFeaturesView.tsx` (New Component)**:
   - Full-page responsive view with back button (`ArrowLeft`), search/filter bar for quick lookup, and categorized responsive grid cards.
   - Includes **Cave AI** companion tile styled with special emerald-amber branding and sparkle badge.
   - Includes all Islamic features: Quran, Tasbih, Hisnul Muslim, Qibla, Mosques, Prayer Journey, Qaza Calculator, Fasting & Ramadan, Cave Circle, Faith Tokens, Partner Shops, Cave Media, and Prayer Alerts.
   - Handles navigation to all views, modals (Qibla, Mosques, Tasbih), and feature tabs.
4. **`src/components/SupportView.tsx`**:
   - Remove `'guide'` from `SupportTab` type and tab buttons.
   - Ensure default tab is `'faq'` or `'ticket'`.
5. **`src/App.tsx`**:
   - Add cases for `activeTab === 'all_features'` and `activeTab === 'cave_ai'` with seamless rendering and back handling.
6. **Localization (`src/locales/bn.ts` & `src/locales/en.ts`)**:
   - Add translation strings for "See More", "All Features", and "Cave AI".

---

## 4. Verification & Testing Plan
- **Type Checking**: Run `npx tsc --noEmit` to verify type safety across `ActiveTab` updates.
- **Build Verification**: Run `compile_applet` to confirm zero compilation errors.
- **Navigation Verification**: Verify clicking "See More" navigates to All Features, clicking Cave AI opens the AI Assistant, back button returns cleanly, and SupportView remains clean and functional.
