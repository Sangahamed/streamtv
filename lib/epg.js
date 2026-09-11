// lib/epg.js — Guide des programmes iptv-org
export async function getEPG(channelId, country = 'fr') {
  const res = await fetch(`https://iptv-org.github.io/epg/guides/${country}.xml`, {
    next: { revalidate: 3600 }
  });
  const text = await res.text();

  // Parsing simple avec regex (plus rapide que XML parser pour du serverless)
  const programmes = [];
  const regex = /<programme[^>]*channel="([^"]*)"[^>]*start="([^"]*)"[^>]*stop="([^"]*)"[^>]*>[\s\S]*?<title>([^<]*)<\/title>(?:[\s\S]*?<desc>([^<]*)<\/desc>)?/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] === channelId) {
      programmes.push({
        title: match[4],
        desc: match[5] || '',
        start: parseEPGDate(match[2]),
        end: parseEPGDate(match[3])
      });
    }
  }

  const now = new Date();
  return programmes
    .filter(p => p.end > now)
    .sort((a, b) => a.start - b.start)
    .slice(0, 3);
}

function parseEPGDate(str) {
  // Format EPG : 20260909230000 +0000
  const year = str.slice(0, 4);
  const month = str.slice(4, 6);
  const day = str.slice(6, 8);
  const hour = str.slice(8, 10);
  const min = str.slice(10, 12);
  return new Date(`${year}-${month}-${day}T${hour}:${min}:00Z`);
}
