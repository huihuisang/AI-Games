# AI Games Agent Guide

## Project Scope

This repository contains browser games and its shared index. [README](README.md) lists the runnable games.

## Required Constraints

- Push only when the user explicitly requests it for the current change.
- Keep game changes scoped to the affected game and shared index behavior. Preserve unrelated games and assets.
- Treat existing generated or local screenshots as evidence unless the user asks to include delivery assets.

## Verification

- Open the affected game through a local HTTP server. Check its primary input and reset behavior. Check index navigation when shared files change.

## Read for This Task

- Before editing a game, inspect its own source and any local guide. Use [design](design/) for shared design assets and [memory](memory/) for project decisions.
