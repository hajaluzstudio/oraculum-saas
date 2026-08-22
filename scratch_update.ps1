$extracted = Get-Content "C:\Users\hajal\.gemini\antigravity-ide\brain\a5be9aa3-700a-47f1-8aa5-74bd8a95ab9e\scratch\extracted.html" -Raw -Encoding UTF8
$index = Get-Content "d:\HAJA LUZ\Antigravity\Dados_IA\scratch\oraculum-saas\public\index.html" -Raw -Encoding UTF8

$bodyMatch = [regex]::Match($extracted, '<body>([\s\S]*?)</body>')
$newBody = $bodyMatch.Groups[1].Value

$headMatch = [regex]::Match($extracted, '<head>([\s\S]*?)</head>')
$newHead = $headMatch.Groups[1].Value

$styleMatch = [regex]::Match($newHead, '<style>[\s\S]*?</style>')
$styleContent = $styleMatch.Groups[0].Value

$styleContent = $styleContent.Replace('html, body {', '#auth-gate-container {')

$newBody = $newBody.Replace('onsubmit="handleLogin(event)"', 'onsubmit="window.executarLogin(event)" id="form-login"')
$newBody = $newBody.Replace('id="auth-email"', 'id="login-email"')
$newBody = $newBody.Replace('id="auth-password"', 'id="login-password"')
$newBody = $newBody.Replace('class="btn-login-submit"', 'class="btn-login-submit" id="btn-submit-login"')
$newBody = $newBody.Replace('</form>', '  <input type="checkbox" id="remember-me" checked style="display: none;">' + "`n" + '    </form>')

$newBody = $newBody -replace '(?s)function handleLogin\(e\).*?(?=\s*// =+)', ''

$scriptTags = "`n<script src=`"https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`"></script>`n"

$wrappedNewContent = '  <div id="auth-gate-container" class="fixed inset-0 z-50 bg-[#010403] relative overflow-hidden" style="display: flex !important;">' + "`n" + $scriptTags + "`n" + $styleContent + "`n" + $newBody + "`n" + '  </div>'

$index = $index -replace '(?s)<div id="auth-gate-container".*?(?=<!-- MAIN DASHBOARD CONTAINER)', ($wrappedNewContent.Replace('$', '$$$$') + "`n`n  ")

Set-Content "d:\HAJA LUZ\Antigravity\Dados_IA\scratch\oraculum-saas\public\index.html" $index -Encoding UTF8
