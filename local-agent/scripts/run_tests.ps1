param(
    [switch]$a,
    [switch]$c,
    [switch]$l,
    [switch]$n
)

Write-Host "Please start the required backend servers (AnythingLLM, LMStudio, Nexa) manually."
Write-Host "Press Enter when complete."
Read-Host


# Get the project root directory (parent of scripts folder)
Set-Location $PSScriptRoot\..

$tests = @()
if ($a -or (-not $a -and -not $c -and -not $l -and -not $n)) { $tests += "tests/test_anythingllm.py" }
if ($c -or (-not $a -and -not $c -and -not $l -and -not $n)) {
    $tests += "tests/core/test_agent.py"
    $tests += "tests/core/test_model.py"
    $tests += "tests/core/test_tools.py"
}
if ($l -or (-not $a -and -not $c -and -not $l -and -not $n)) { $tests += "tests/test_lmstudio.py" }
if ($n -or (-not $a -and -not $c -and -not $l -and -not $n)) { $tests += "tests/test_nexa.py" }

if ($tests.Count -eq 0) {
    $tests = @("tests/test_anythingllm.py", "tests/test_lmstudio.py", "tests/test_nexa.py", "tests/core/test_agent.py", "tests/core/test_model.py", "tests/core/test_tools.py")
}

Write-Host "Running pytest for: $($tests -join ', ')"

# Activate venv if not already active
if (-not $env:VIRTUAL_ENV) {
    $venvPath = "venv/Scripts/Activate.ps1"
    if (Test-Path $venvPath) {
        Write-Host "Activating virtual environment..."
        . $venvPath
    }
}

# Run pytest
pytest $tests
