const fs = require('fs');

const extractedPath = 'C:\\Users\\hajal\\.gemini\\antigravity-ide\\brain\\a5be9aa3-700a-47f1-8aa5-74bd8a95ab9e\\scratch\\extracted.html';
const indexPath = 'd:\\HAJA LUZ\\Antigravity\\Dados_IA\\scratch\\oraculum-saas\\public\\index.html';

const newHtml = fs.readFileSync(extractedPath, 'utf-8');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');

const bodyMatch = newHtml.match(/<body>([\s\S]*?)<\/body>/);
let newBody = bodyMatch ? bodyMatch[1] : '';

const headMatch = newHtml.match(/<head>([\s\S]*?)<\/head>/);
const newHead = headMatch ? headMatch[1] : '';

const styleMatch = newHead.match(/<style>[\s\S]*?<\/style>/);
let styleContent = styleMatch ? styleMatch[0] : '';
const scriptTags = '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n';

styleContent = styleContent.replace('html, body {', '#auth-gate-container {');

newBody = newBody.replace('onsubmit="handleLogin(event)"', 'onsubmit="window.executarLogin(event)" id="form-login"');
newBody = newBody.replace('id="auth-email"', 'id="login-email"');
newBody = newBody.replace('id="auth-password"', 'id="login-password"');
newBody = newBody.replace('class="btn-login-submit"', 'class="btn-login-submit" id="btn-submit-login"');
newBody = newBody.replace('</form>', '  <input type="checkbox" id="remember-me" checked style="display: none;">\n    </form>');

newBody = newBody.replace(/function handleLogin\(e\)[\s\S]*?(?=\s*\/\/ =+)/, '');

const wrappedNewContent = `  <div id="auth-gate-container" class="fixed inset-0 z-50 bg-[#010403] relative overflow-hidden" style="display: flex !important;">
${scriptTags}
${styleContent}
${newBody}
  </div>`;

const replacePattern = /<div id="auth-gate-container"[\s\S]*?(?=<!-- MAIN DASHBOARD CONTAINER)/;
indexHtml = indexHtml.replace(replacePattern, wrappedNewContent + '\n\n  ');

fs.writeFileSync(indexPath, indexHtml, 'utf-8');
console.log('Update successful');
