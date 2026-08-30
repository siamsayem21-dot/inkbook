// QA Engine — production reachability smoke check.
const url = process.env.QA_BASE_URL;
if (!url) { console.error("QA_BASE_URL not set"); process.exit(1); }

try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  console.log(`reachable, HTTP ${res.status}`);
  process.exit(0);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
