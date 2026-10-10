# SikhyaSetu

SikhyaSetu is an offline-first, AI-assisted learning platform for Odia-medium students. It is structured around the proposal’s core loop: offline lesson execution, misconception fingerprinting, teach-back capture, deferred cloud grading, and teacher action briefs.

## Repository structure

- frontend/: React + TypeScript PWA shell and local-first learner experience
- backend/: FastAPI APIs, domain logic, and workflow orchestration
- shared/: shared contracts, schemas, and compatibility definitions
- docs/: architecture, product, privacy, and proposal references
- scripts/: setup, validation, CI, and release automation

## Proposal alignment

This repository keeps the proposal’s MVP boundaries intact:

- offline-first delivery on a low-connectivity shared phone
- local state and event queueing with eventual sync
- cloud planner and pack compiler that optimize the next lesson under data/time budgets
- teacher-facing summary built from actual learner evidence

The project remains a structure-first scaffold in line with the proposal and is intentionally not expanded into unrelated product work.
