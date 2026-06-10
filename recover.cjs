const { execSync } = require('child_process');
try {
  console.log(execSync('git checkout main -- src/pages/ChatPage.tsx src/index.css index.html', {encoding: 'utf8'}));
} catch (e) {
  console.error(e.message);
}
