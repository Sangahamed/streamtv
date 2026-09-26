// Préchauffe le catalogue TV dès le démarrage du serveur : le premier
// visiteur n'attend plus la quarantaine de secondes de téléchargement des
// annuaires iptv-org / Free-TV.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const { warmLiveTvData } = await import('./lib/iptv');
  warmLiveTvData();
}
