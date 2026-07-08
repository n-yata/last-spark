# PostToolUse hook: git worktree / checkout / switch 実行後に、実際の git 状態を
# 追加コンテキストとして返す。

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

try {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }
    $payload = $raw | ConvertFrom-Json
    $command = [string]$payload.tool_input.command
} catch {
    exit 0
}

if ([string]::IsNullOrWhiteSpace($command)) { exit 0 }

$isTarget = $command -match '(?i)\bgit\b[\s\S]*\b(worktree|checkout|switch)\b'
if (-not $isTarget) { exit 0 }
$verb = $matches[1]

$ErrorActionPreference = 'Continue'

function Get-GitText([string[]]$gitArgs) {
    try {
        $out = (& git @gitArgs 2>&1 | Out-String)
        if ([string]::IsNullOrWhiteSpace($out)) { return '(出力なし)' }
        return $out.Trim()
    } catch {
        return "(取得失敗: $($_.Exception.Message))"
    }
}

$worktrees = Get-GitText @('worktree', 'list')
$branch = Get-GitText @('rev-parse', '--abbrev-ref', 'HEAD')
$top = Get-GitText @('rev-parse', '--show-toplevel')
$cwd = (Get-Location).Path

$context = @"
[git状態確認 hook] 直前の "git $verb" 実行後の実際のリポジトリ状態です。
報告は必ずこの事実と照合してください。意図ではなく下記の実態が正です。
<git-data>
cwd: $cwd
toplevel: $top
current branch: $branch
worktrees:
$worktrees
</git-data>
"@

$out = @{
    hookSpecificOutput = @{
        hookEventName = 'PostToolUse'
        additionalContext = $context
    }
}
$out | ConvertTo-Json -Compress -Depth 5
exit 0
