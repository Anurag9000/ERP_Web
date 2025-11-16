# Outstanding Features & Tasks

## Baseline Specification
*(All baseline items completed)*

## Platform & Architecture

## Authentication & Security
- Add admin password reset workflow enforcing `must_change_password`.
- Extend audit trail logging (maintenance toggles, enrollment overrides, grade edits) and build export UI.

## Data Migration & Repositories
- Introduce DAO-backed services for enrollment/grade/attendance/waitlist/settings instead of inline Supabase calls.
- Provide migration tooling/docs to import legacy `.dat` data into SQL.
- Add datasource health probes and robust DAO error handling strategy.

## Student Experience
- Implement complete registration enhancements: clash detection (time & room), automated waitlist promotion with advisor approvals, deadline enforcement, co-/anti-requisite handling, departmental/advisor approvals.
- Build timetable grid visualization and improved printable/PDF output.
- Create GPA/standing analytics (trend graphs, probation alerts).
- Add transcript watermarking, certificate downloads, registrar messaging flow.
- Deliver fee schedule configuration UI, installment visualization, reminder messaging.
- Upgrade notification inbox with maintenance/system broadcast filters, digests, SMS/email stubs, admin history.

## Instructor Workspace
- Implement attendance CSV import/export, bulk updates, tardiness tracking, analytics dashboards.
- Deliver gradebook enhancements (assessment templates, import/export, moderation, publish/finalise toggles, rubrics/feedback).
- Add analytics widgets (grade distributions, pass/fail counts, attendance metrics w/ charts).
- Build messaging hub for instructors to reach enrolled students/sections.
- Create section planner with room clash/capacity warnings.

## Admin Console & Operations
- Build full user lifecycle UI (create/assign roles, suspend/reactivate, audit reset events).
- Implement catalog management for courses/sections/rooms/prereqs/capacity planning.
- Provide enrollment oversight tools (approvals, overrides, extensions, waitlist management).
- Ship maintenance scheduler UI (immediate + future windows, countdown banners, notifications).
- Add data governance tooling (backup/restore wrappers, archival, anonymisation scripts/docs).
- Deliver reporting suite (enrollment trends, waitlist pressure, attendance compliance, financial arrears).
- Support bulk CSV/XLS import/export for students, instructors, courses, enrollments.

## Maintenance & Notifications
- Implement central maintenance guard covering every write path and scheduling flows.
- Enhance notification centre with targeted broadcasts, email/SMS stubs, digest configuration, admin history view.

## Analytics & Degree Planning Enhancements
- Build degree audit planner, advisor dashboards, risk alerts.
- Add real-time analytics visualisations (heatmaps, waitlist pressure).
- Implement advising communication log / issue tracker linked to student profiles.

## Testing, CI, Quality
- Create automated unit/integration tests for DAO/service layers and UI smoke tests.
- Assemble acceptance checklist covering login roles, registration, waitlist, maintenance, grade entry, transcripts, finance exports.
- Add load/performance sanity tests for large catalog/student cohorts.
- Configure CI pipeline (GitHub Actions or similar) running migrations, tests, packaging.
- Review logging/audit configuration (Logback-equivalent tuning, retention policy).

## Documentation & Deliverables
- Produce architecture/maintenance/enhancement/testing report (5–7 pages).
- Generate diagram set (use-case, ERD, component/class, sequence).
- Expand how-to-run docs with environment setup, default credentials, migration instructions.
- Create demo assets (storyboard, script, slides, recorded walkthrough).
- Publish CHANGELOG, contribution guidelines, dependency license notices.

## Deployment & Packaging
- Provide JVM build artefacts (Maven/Gradle profiles, fat JAR) or update spec expectations for the React stack; include externalised config & sample `.env`.
- Add Docker Compose (DB + app), sample data seed automation, smoke-test scripts.
- Expose optional REST layer (Spring Boot/Javalin) for integrations/mobile clients.

## Additional Enhancements
- Ship public API surface for integrations/mobile apps.
- Implement CSV/XLS importers for students/courses/enrollments/grades/attendance with validation & rollback.
- Add exports (gradebooks, schedules, instructor financial statements).
- Build advisor approval workflow tied into registration UI/backend.

## Student-Centric Calendar & UX Backlog
- **Calendar & Planner:** Central smart calendar hub, auto-filled classes/tests, manual opt-in events, pastel subject palette, dot indicators, weekly/monthly planners.
- **Visual Design System:** Enforce pastel UI theme, subject color consistency across modules, minimal UX rules.
- **Event Philosophy:** Opt-in event handling, headline-only defaults, strict noise control (no auto dumps).
- **Faculty Interaction:** Appointment/slot booking, TA routing, professor profile visibility, “Where’s My Prof?” lookup, availability timelines.
- **Personalisation & Notifications:** Per-category preferences, anti-spam rules, personalised defaults.
- **Department Logic:** Dept-based default visibility, cross-department toggle/curiosity workflows.
- **Rollout/Trust/Architecture:** Institute-first rollout strategy, app vs web usage guidance, privacy/compliance plan.
- **UX Micro-Details:** Subject background rules, non-techie-friendly labels, accessibility themes.
- Admin-driven timetable publishing with cross-department toggle and latest-version consumption for faculty/students.
- Assignments & tests module (dashboards, reminders, uploads, marks breakdown linked to internals).
- Attendance & internal marks view tying attendance into internal scores with component visibility.
- Examination window experience: exam form, fee, admit card, syllabus, datesheet, marksheet in one flow.
- Announcements hub with multi-category feeds, opt-in calendar additions, and noise controls.
- Faculty communication flow (appointment requests, TA routing, formal contact info).
- Professor profile visibility including “Where’s my prof now?” quick lookup.
- Color-coding system ensuring consistent pastel palette across calendar/assignments/marks/faculty references.
- Notification strategy: assignment/test reminders, minimal nudges, user-level spam control.
- Grades tracking enhancements (per assessment/test marks, SGPA/CGPA trackers, course-wise breakdown).
- Courses overview & planner derived from calendar/tasks with weekly/monthly views.
- Role-based dashboard refresh reflecting new student/prof/admin modules.
- Department visibility controls with deliberate cross-dept peek capability.
- Security/compliance messaging for institutional trust/adoption.
- UI/UX benchmark rules enforcing minimal, intuitive navigation with color cues.
- Optional Google Classroom sync for institutes already using GC.
- Meeting slots workflow (students request, professors approve/offer slots).
- Manual event philosophy enforcement (opt-in campus events only).
- Booking tutor/TA support channel with routing.
- Unified exam artefacts UX ensuring form→admit→syllabus→datesheet→marksheet continuity.
- App/web balance plan (high-frequency tasks in app, low-touch via web).
- Admin/prof controls over timetable/course artefacts; others view-only.
- Announcement safety rails where categories drive notification priority.
- Research/collaboration mode for student–professor connections.
- Personalisation defaults (auto-load must-have entries, electives opt-in).
- Cross-department curiosity subscriptions for events/timetables.
- Scalable architecture hooks for configurable categories/roles/mark schemes.
- Editable timetable windows for ad-hoc demos/vivas assignments with instant impact preview.
- Current marks within course panels (running marks/grades).
- TA office hours & booking with delegation route.
- Interest clubs dashboard with category announcements and manual calendar add.
- Timetable conflict simulator for admins before publishing.
- Free slot finder to compute common free hours.
- External calendar sync (iCal feeds per user to Google/Apple calendars).
- Inline feedback threads for assignments/tests with acknowledgements.
- Theme & accessibility settings (high contrast, font scaling, color-blind palettes).
- Preference-based notifications (category controls, digest frequency).
- Personal learning goals dashboard for attendance/grade goals with visuals.
