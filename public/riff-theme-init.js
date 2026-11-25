try {
  var riffTheme = localStorage.getItem('riff-theme')
  if (riffTheme === 'midnight' || riffTheme === 'plum' || riffTheme === 'ember') {
    document.documentElement.dataset.theme = riffTheme
  }
} catch {
  // Keep the default theme when browser storage is unavailable.
}
