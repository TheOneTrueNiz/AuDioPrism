// inject.js - Runs in the MAIN page context (not content script isolation)
// Used to steal internal API keys from the global window object

const attemptPrismInjection = () => {
    // Check for the internal YouTube Music config object
    if (window.ytcfg && window.ytcfg.data_ && window.ytcfg.data_.INNERTUBE_API_KEY) {
        // Send credentials back to the content script via standard Window messaging
        window.postMessage({
            type: 'PRISM_CREDENTIALS',
            apiKey: window.ytcfg.data_.INNERTUBE_API_KEY,
            context: window.ytcfg.data_.INNERTUBE_CONTEXT
        }, '*');
    } else {
        // Retry if YTM is still loading
        setTimeout(attemptPrismInjection, 1000);
    }
};

attemptPrismInjection();
