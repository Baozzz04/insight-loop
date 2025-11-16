#!/bin/bash

# Usage: ./run_tests.sh [-a] [-l]
# -a: Run AnythingLLM tests only
# -c: Run core tests only
# -l: Run LMStudio tests only

set -e

# Prompt user to start backend servers
cat <<EOF
Please start the required backend servers (AnythingLLM, LMStudio, Nexa) manually.
Press Enter when complete.
EOF
read

# Move to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Parse arguments
a_flag=false
c_flag=false
l_flag=false
while getopts "acl" opt; do
  case $opt in
    a) a_flag=true ;;
    c) c_flag=true ;;
    l) l_flag=true ;;
    *) ;;
  esac
done

# Determine tests to run
tests=()
if $a_flag || (! $a_flag && ! $c_flag && ! $l_flag); then tests+=("tests/test_anythingllm.py"); fi
if $c_flag || (! $a_flag && ! $c_flag && ! $l_flag); then
  tests+=("tests/core/test_agent.py")
  tests+=("tests/core/test_model.py")
  tests+=("tests/core/test_tools.py")
fi
if $l_flag || (! $a_flag && ! $c_flag && ! $l_flag); then tests+=("tests/test_lmstudio.py"); fi

if [ ${#tests[@]} -eq 0 ]; then
  tests=("tests/test_anythingllm.py" "tests/test_lmstudio.py" "tests/core/test_agent.py" "tests/core/test_model.py" "tests/core/test_tools.py")
fi

echo "Running pytest for: ${tests[*]}"

# Activate venv if not already active
if [ -z "$VIRTUAL_ENV" ]; then
  if [ -f "venv/bin/activate" ]; then
    echo "Activating virtual environment..."
    source "venv/bin/activate"
  fi
fi

# Run pytest
pytest "${tests[@]}"
