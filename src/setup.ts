




export const PREFIX = 
`
import sys
from pyodide.ffi import run_sync, to_js
from js import pauseHook     
SHOULD_INTERRUPT = False
INPUT_VAR = ""
_COUNTER, _EVERY = 0, 2000
STEPS = []
def _yield_to_js(msg=None):
    # Block until JS finishes its work.
    run_sync(pauseHook(to_js(msg)))
def _safe_locals(locals_dict):
    filtered = {}
    for k, v in locals_dict.items():
        if k == 'STEPS':
            continue
        # Optional: skip huge or non-serializable types
        if isinstance(v, (int, float, str, bool, list, dict, tuple, type(None))):
            filtered[k] = v
        else:
            filtered[k] = str(type(v).__name__)  # lightweight stub
    return filtered

def _tracer(frame, event, arg):
    global _COUNTER, SHOULD_INTERRUPT, STEPS
    if SHOULD_INTERRUPT:
        SHOULD_INTERRUPT = False
        raise KeyboardInterrupt("Execution interrupted by user")

    if event == "line" and frame.f_code.co_filename == "<exec>":
        function_name = frame.f_code.co_name
        line_number = frame.f_lineno

        # Filter local variables safely

        STEPS.append([function_name, line_number])
        if len(STEPS) > 1000:
            STEPS.pop(0)

        _COUNTER += 1
        if _COUNTER >= _EVERY:
            _COUNTER = 0
            _yield_to_js({"where": f"{function_name}:{line_number}"})

    return _tracer

def enable_auto_pause(every=500):
    global _EVERY
    _EVERY = max(1, every)
    sys.settrace(_tracer)

def __input_overrride__(prompt):
    global INPUT_VAR
    _yield_to_js({"where": "input", "prompt": prompt})
    return INPUT_VAR

input = __input_overrride__

enable_auto_pause(400)

`