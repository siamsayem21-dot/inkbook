// Temporarily serve the before version by copying it over page.tsx,
// restarting, and capturing. We'll restore after.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = 'C:\\Users\\asiacom\\Desktop\\inkbook\\screenshots';
const PAGE = 'C:\\Users\\asiacom\\Desktop\\inkbook\\app\\page.tsx';
const BEFORE = 'C:\\Users\\asiacom\\Desktop\\inkbook\\app\\page-before.tsx';
const BACKUP = 'C:\\Users\\asiacom\\Desktop\\inkbook\\app\\page-backup.tsx';

// Swap in the before version
fs.copyFileSync(PAGE, BACKUP);
fs.copyFileSync(BEFORE, PAGE);
console.log('Swapped to BEFORE version. Please restart dev server and run this script part 2.');
// We can't restart the dev server from here, so just note the files
