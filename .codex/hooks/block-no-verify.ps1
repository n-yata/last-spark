# PreToolUse hook: git commit/push の --no-verify(-n) / フックスキップを機械的にブロックする。
#
# 入力: stdin に PreToolUse の JSON ({ tool_input: { command: "..." } })
# 出力: deny する場合のみ hookSpecificOutput を JSON で stdout に返す。

$ErrorActionPreference = 'Stop'

try {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }
    $payload = $raw | ConvertFrom-Json
    $command = [string]$payload.tool_input.command
} catch {
    exit 0
}

if ([string]::IsNullOrWhiteSpace($command)) { exit 0 }

$isGitCommitOrPush = $command -match '(?i)\bgit\b[\s\S]*\b(commit|push)\b'
if (-not $isGitCommitOrPush) { exit 0 }

$hasNoVerify = $command -match '(?i)(^|\s)--no-verify(\s|$)'
$hasNoGpg = $command -match '(?i)(^|\s)--no-gpg-sign(\s|$)'
$hasShortN = $command -match '(?i)(^|\s)-n(\s|$)'

if ($hasNoVerify -or $hasNoGpg -or $hasShortN) {
    $reason = 'git の commit/push に対するフックスキップ(--no-verify / -n / --no-gpg-sign)は禁止されています。' +
        'コミット前に security-engineer によるセキュリティレビューを実施してください。'
    $out = @{
        hookSpecificOutput = @{
            hookEventName = 'PreToolUse'
            permissionDecision = 'deny'
            permissionDecisionReason = $reason
        }
    }
    $out | ConvertTo-Json -Compress -Depth 5
    exit 0
}

exit 0
