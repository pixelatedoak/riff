try {
    const theme = window.localStorage.getItem('riff-theme')
    if (theme === 'midnight' || theme === 'plum' || theme === 'ember') {
        document.documentElement.dataset.theme = theme
    }
} catch {
    // Keep the default theme when browser storage is unavailable.
}
