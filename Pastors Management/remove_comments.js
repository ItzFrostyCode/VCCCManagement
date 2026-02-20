const fs = require('fs');
const path = require('path');

const basePath = '/Users/joshuawaymanarabejo/Documents/Projects/Websites/Pastors Management';

function removeHtmlComments(content) {
  return content.replace(/<!--[\s\S]*?-->/g, '');
}

function removeJsCssComments(content) {
  // Removes block comments and line comments. 
  // Be careful with URLs in line comments but there are none likely to break except inside strings.
  // A safer simple regex for this codebase:
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/ .*/g, '');
}

// 1. Process index.html
let indexContent = fs.readFileSync(path.join(basePath, 'index.html'), 'utf8');
indexContent = removeHtmlComments(indexContent);

const seoTags = `
  <title>VCCC Management System</title>
  <meta name="description" content="VCCC Management System to manage districts, cities, zones, churches, and pastors with full assignment tracking.">
  <meta name="keywords" content="VCCC, VCCC Management, Church Management System, Pastors Management, VCCCManagement">
  <meta property="og:title" content="VCCC Management System">
  <meta property="og:description" content="VCCC Management System to manage districts, cities, zones, churches, and pastors with full assignment tracking.">
  <meta property="og:url" content="https://vcccmanagement.netlify.app/">
  <meta property="og:type" content="website">
  <meta name="robots" content="index, follow">`;

indexContent = indexContent.replace(
  /<title>Church Management System<\/title>[\s\S]*?<meta name="description" content=".*?">/,
  seoTags.trim()
);

fs.writeFileSync(path.join(basePath, 'index.html'), indexContent);

// 2. Process js/app.js
let appJsContent = fs.readFileSync(path.join(basePath, 'js/app.js'), 'utf8');
appJsContent = removeJsCssComments(appJsContent);
// Clean up excessive empty lines
appJsContent = appJsContent.replace(/^\s*[\r\n]/gm, '\n');
fs.writeFileSync(path.join(basePath, 'js/app.js'), appJsContent);

// 3. Process css/style.css
let styleContent = fs.readFileSync(path.join(basePath, 'css/style.css'), 'utf8');
styleContent = removeJsCssComments(styleContent);
styleContent = styleContent.replace(/^\s*[\r\n]/gm, '\n');
fs.writeFileSync(path.join(basePath, 'css/style.css'), styleContent);

console.log("Comments removed and SEO tags added.");
