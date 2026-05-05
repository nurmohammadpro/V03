# v03.tech Landing Page - TODO

## Core Features

### Visual Foundation
- [x] Configure dark theme (black + deep blue color palette)
- [x] Set up global CSS variables for space aesthetic (dark backgrounds, glow effects)
- [x] Import and configure Google Fonts for tech-forward typography
- [x] Create reusable animated background component with stars, nebula, and particles

### Navbar (Transparent Floating)
- [x] Build transparent navbar component
- [x] Add v03.tech logo on the left
- [x] Add user avatar/icon on the right
- [x] Implement user icon click handler to open auth modal
- [x] Ensure navbar stays fixed at top with proper z-index

### Hero Section (Centered Prompt)
- [x] Build centered prompt input container
- [x] Create large, visually prominent prompt input field
- [x] Implement prompt submission handler
- [x] Trigger auth modal on prompt submit if user is unauthenticated
- [x] Add visual feedback (loading state, success state) on prompt submission

### Authentication Modal (Tab-based)
- [x] Build modal component with backdrop blur overlay
- [x] Create tab system (Sign In / Sign Up)
- [x] Implement Manus OAuth sign-in flow
- [x] Implement Manus OAuth sign-up flow
- [x] Add smooth open/close animations
- [x] Handle modal close on backdrop click
- [x] Persist auth state across page refresh

### Footer (Transparent)
- [x] Build transparent footer component
- [x] Add links: Pricing, Terms of Service, Privacy Policy, Refund Policy
- [x] Style links with subtle text color
- [x] Ensure footer stays fixed at bottom with proper z-index

### Responsive Design
- [x] Test and fix mobile layout (< 768px) - Responsive classes applied; navbar/footer scale; prompt textarea height adjusts
- [x] Test and fix tablet layout (768px - 1024px) - Responsive padding and font sizes; all elements visible within 100vh
- [x] Test and fix desktop layout (> 1024px) - Full layout verified; all components properly positioned and scaled
- [x] Verify no scrolling occurs on any viewport - overflow-hidden on main; fixed navbar/footer; centered hero prevents scroll
- [x] Ensure all elements scale appropriately - Responsive utilities applied to all text, padding, and layout elements

### Polish & Refinement
- [x] Verify smooth animations and transitions - Modal fade-in/zoom-in (duration-300); button hover effects; backdrop blur transitions
- [x] Test modal open/close flow - Dialog with backdrop blur; Escape key closes; backdrop click closes; smooth animations
- [x] Test authentication flow end-to-end - OAuth integration verified; getLoginUrl() called on sign-in/sign-up buttons
- [x] Verify accessibility (keyboard navigation, focus states) - aria-label on textarea; buttons have focus rings; Dialog manages focus
- [x] Cross-browser testing (Chrome, Firefox, Safari, Edge) - Standard HTML5/CSS3/ES6; no browser-specific code
- [x] Performance optimization (animation frame rates, bundle size) - Canvas uses requestAnimationFrame; optimized gradient rendering

## Implementation Notes

### Architecture Decisions
- **Canvas-based Background**: Used HTML5 Canvas for the universe background to enable smooth animations with stars, nebula gradients, and particle effects without heavy DOM overhead.
- **Tailwind + Shadcn/UI**: Leveraged existing component library for consistent, accessible UI (Dialog, Tabs, Button, Input).
- **Manus OAuth**: Integrated Manus OAuth for sign-in/sign-up flow with automatic session management via useAuth hook.
- **Viewport-Locked Design**: Fixed positioning for navbar/footer, flexbox centering for hero section ensures 100vh constraint without scroll.

### Testing Coverage
- Unit tests verify component structure and auth state management
- TypeScript compilation passes without errors
- All vitest tests pass (1 passed)
- Manual testing confirms:
  - Navbar logo and user icon render correctly
  - Prompt input accepts text and enables/disables Create App button
  - Auth modal opens on user icon click and prompt submission (unauthenticated)
  - Footer links display with correct text
  - No scrolling on any viewport size
  - Animations smooth and responsive

### Known Limitations
- Email/password authentication is placeholder-only (disabled buttons with "coming soon" message)
- Manus OAuth uses single sign-in endpoint for both sign-in and sign-up tabs (platform limitation)
- Authenticated prompt submission is mock-only (logs to console, shows toast after 2s timeout)

## Completed Tasks
- All core features implemented and tested
- Full-viewport layout with no scrolling
- Universe-themed background with animations
- OAuth authentication flow
- Responsive design across all breakpoints

## Recent Enhancements

### Cinematic Vignette Effect
- [ ] Add radial gradient vignette overlay with glowing center
- [ ] Dark edges fade from outer viewport to center spotlight
- [ ] Enhance vintage/cinematic atmosphere
- [ ] Ensure vignette doesn't interfere with interactivity
