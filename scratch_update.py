import re

with open(r'C:\Users\hajal\.gemini\antigravity-ide\brain\a5be9aa3-700a-47f1-8aa5-74bd8a95ab9e\scratch\extracted.html', 'r', encoding='utf-8') as f:
    new_html = f.read()

with open(r'd:\HAJA LUZ\Antigravity\Dados_IA\scratch\oraculum-saas\public\index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

body_match = re.search(r'<body>(.*?)</body>', new_html, re.DOTALL)
new_body = body_match.group(1) if body_match else ""

head_match = re.search(r'<head>(.*?)</head>', new_html, re.DOTALL)
new_head = head_match.group(1) if head_match else ""

style_match = re.search(r'<style>.*?</style>', new_head, re.DOTALL)
style_content = style_match.group(0) if style_match else ""
script_tags = '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'

# Scope body styles to #auth-gate-container so dashboard is not affected
style_content = style_content.replace('html, body {', '#auth-gate-container {')

# Hook up form to existing app login
new_body = new_body.replace('onsubmit="handleLogin(event)"', 'onsubmit="window.executarLogin(event)" id="form-login"')
new_body = new_body.replace('id="auth-email"', 'id="login-email"')
new_body = new_body.replace('id="auth-password"', 'id="login-password"')
new_body = new_body.replace('class="btn-login-submit"', 'class="btn-login-submit" id="btn-submit-login"')
new_body = new_body.replace('</form>', '  <input type="checkbox" id="remember-me" checked style="display: none;">\n    </form>')

# Remove dummy handleLogin function
new_body = re.sub(r'function handleLogin\(e\)\s*\{.*?\}(?=\s*// =+)', '', new_body, flags=re.DOTALL)

# Wrap new elements
wrapped_new_content = f"""  <div id="auth-gate-container" class="fixed inset-0 z-50 bg-[#010403] relative overflow-hidden" style="display: flex !important;">
{script_tags}
{style_content}
{new_body}
  </div>"""

# Replace existing auth-gate-container
replace_pattern = r'<div id="auth-gate-container"[\s\S]*?(?=<!-- MAIN DASHBOARD CONTAINER)'
index_html = re.sub(replace_pattern, wrapped_new_content + '\n\n  ', index_html, count=1)

with open(r'd:\HAJA LUZ\Antigravity\Dados_IA\scratch\oraculum-saas\public\index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)
