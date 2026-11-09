export const intro = window.houseIntroLoader;
export async function loadSceneJson(url) {
    const response = await fetch(url);
    if (!response.ok)
        throw new Error('Could not load scene resource: ' + url + ' (' + response.status + ')');
    const data = await response.json();
    intro?.complete(url);
    return data;
}
export function assetProgress(url) { return (event) => intro?.transfer(url, event.loaded, event.total); }
