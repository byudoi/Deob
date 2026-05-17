# unobfuscated_scripts_complex

This directory contains richer, non-malicious Roblox Lua scripts intended for your
**offline obfuscation/de-obfuscation regression checks**.

The new files focus on script shapes that are often tougher to de-obfuscate correctly:

- `ComplexUIDashboard.lua`  
  - Nested UI tree, draggable/driven frame, periodic update loop, tweened feedback, debounced actions, cleanup path.
- `ComplexStateMachine.lua`  
  - Finite state machine with metatable-style objects, input transitions, renderstep updates, cancellable lifecycle.
- `AsyncTweenPipeline.lua`  
  - Priority queue + worker coroutine pipeline, async tween jobs, status tracking, and periodic job injection.
- `NestedUISwitcher.lua`  
  - Recursive UI component generation, dynamic list sizing, input-based rebuild logic, and nested closures.

Use these as local fixture scripts for stress-testing your de-obfuscator against patterns
with:
- UI nesting and event wiring
- multi-step state transitions
- async scheduling and callbacks
- closure-heavy control flow

