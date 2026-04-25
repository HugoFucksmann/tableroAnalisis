export async function fetchWithTimeout(url, options = {}, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const onParentAbort = () => controller.abort();

    if (options.signal) options.signal.addEventListener('abort', onParentAbort);

    try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
    } finally {
        clearTimeout(id);
        if (options.signal) options.signal.removeEventListener('abort', onParentAbort);
    }
}